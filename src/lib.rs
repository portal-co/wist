#![cfg_attr(feature = "wisp-mux", feature(return_type_notation))]

#![no_std]

use core::{future::poll_fn, mem::replace, task::Poll};

use alloc::{borrow::ToOwned, collections::vec_deque::VecDeque, string::String, vec::Vec};
use either::Either;
use itertools::Itertools;
use whisk::Channel;
extern crate alloc;
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum WsFrame {
    String(String),
    Bytes(Vec<u8>),
    Close,
}
impl WsFrame {
    pub fn from_bytes_iter(mut a: &mut (dyn Iterator<Item = u8> + '_)) -> Option<Self> {
        let a = &mut a;
        let flags = a.next()?;
        if flags == 0xff {
            return Some(Self::Close);
        }
        let len = u32::from_be_bytes(a.next_array()?);
        let bytes = (0..len).map(|_| a.next()).collect::<Option<Vec<u8>>>()?;
        if flags & 0x1 == 0 {
            Some(Self::Bytes(bytes))
        } else {
            Some(Self::String(
                String::from_utf8_lossy(&bytes).as_ref().to_owned(),
            ))
        }
    }
    pub fn bytes(&self) -> impl Iterator<Item = u8> {
        let cb = match self {
            WsFrame::Close => return Either::Left([0xff].into_iter()),
            WsFrame::String(s) => s.as_bytes(),
            WsFrame::Bytes(items) => items.as_ref(),
        };
        let flags = match self {
            WsFrame::Close => return Either::Left([0xff].into_iter()),
            WsFrame::String(_) => 0x1,
            WsFrame::Bytes(items) => 0x0,
        };
        Either::Right(
            [flags]
                .into_iter()
                .chain(u32::to_be_bytes((cb.len() & 0xffff_ffff) as u32))
                .chain(cb.iter().cloned()),
        )
    }
}
#[derive(Clone, Default)]
pub struct HTTPHandlerOnce {
    send: Channel<WsFrame>,
    recv: Channel<WsFrame>,
}
impl HTTPHandlerOnce {
    pub async fn process(&self, a: &[u8], max_resp: u32) -> Vec<u8> {
        let mut b = a.iter().cloned();
        while let Some(x) = WsFrame::from_bytes_iter(&mut b) {
            self.send.send(x).await;
        }
        let mut b = Vec::default();
        while b.len() < max_resp as usize {
            b.extend(self.recv.recv().await.bytes());
        }
        b
    }
    pub async fn send_frame(&self, x: WsFrame) {
        self.recv.send(x).await
    }
    pub async fn recv_frame(&self) -> WsFrame {
        self.send.recv().await
    }
}

pub struct WsHandler<H> {
    pub http: H,
    send_buf: Vec<u8>,
    recv_buf: VecDeque<WsFrame>,
}
impl<H> WsHandler<H> {
    pub fn new(http: H) -> Self {
        Self {
            http,
            send_buf: Default::default(),
            recv_buf: Default::default(),
        }
    }
    pub fn send(&mut self, f: WsFrame) {
        self.send_buf.extend(f.bytes());
    }
}
pub trait HTTP {
    type Error;
    async fn req(&mut self, a: &[u8]) -> Result<Vec<u8>, Self::Error>;
}
impl<H: HTTP<Error = E>, E> WsHandler<H> {
    pub async fn recv(&mut self) -> Result<WsFrame, E> {
        loop {
            if let Some(f) = self.recv_buf.pop_front() {
                return Ok(f);
            }
            let s = replace(&mut self.send_buf, Default::default());
            let r = match self.http.req(&s).await {
                Ok(a) => a,
                Err(e) => {
                    self.send_buf = s;
                    return Err(e);
                }
            };
            let mut r = r.into_iter();
            while let Some(x) = WsFrame::from_bytes_iter(&mut r) {
                self.recv_buf.push_back(x);
            }
        }
    }
    pub async fn close(&mut self) -> Result<(), E> {
        self.http.req(&[0xff]).await?;
        Ok(())
    }
}
#[cfg(feature = "wisp-mux")]
const _: () = {
    use alloc::boxed::Box;
    use core::convert::Infallible;

    use wisp_mux::{
        WispError,
        ws::{Frame, LockedWebSocketWrite, OpCode, WebSocketRead, WebSocketWrite},
    };
    #[cfg(feature = "wisp-mux")]
    trait SHTTP: HTTP<req(..): Send> {}
    #[cfg(feature = "wisp-mux")]
    impl<T: HTTP<req(..): Send>> SHTTP for T {}

    #[async_trait::async_trait]
    impl<H: SHTTP<Error = WispError> + Send> WebSocketRead for WsHandler<H> {
        async fn wisp_read_frame(
            &mut self,
            tx: &LockedWebSocketWrite,
        ) -> Result<Frame<'static>, WispError> {
            let r = self.recv().await?;
            Ok(match r {
                WsFrame::String(s) => Frame::text(wisp_mux::ws::Payload::Bytes(
                    s.into_bytes().as_slice().into(),
                )),
                WsFrame::Bytes(items) => {
                    Frame::binary(wisp_mux::ws::Payload::Bytes(items.as_slice().into()))
                }
                WsFrame::Close => return Err(WispError::StreamAlreadyClosed),
            })
        }
    }
    #[async_trait::async_trait]
    impl<H: SHTTP<Error = WispError> + Send> WebSocketWrite for WsHandler<H> {
        async fn wisp_write_frame(&mut self, frame: Frame<'_>) -> Result<(), WispError> {
            self.send(match frame.opcode {
                OpCode::Text => {
                    WsFrame::String(String::from_utf8_lossy(&frame.payload).as_ref().to_owned())
                }
                OpCode::Binary => WsFrame::Bytes(frame.payload.to_vec()),
                _ => todo!(),
            });
            Ok(())
        }
        async fn wisp_close(&mut self) -> Result<(), WispError> {
            self.close().await
        }
    }
    #[async_trait::async_trait]
    impl WebSocketRead for HTTPHandlerOnce {
        async fn wisp_read_frame(
            &mut self,
            tx: &LockedWebSocketWrite,
        ) -> Result<Frame<'static>, WispError> {
            let r = self.recv_frame().await;
            Ok(match r {
                WsFrame::String(s) => Frame::text(wisp_mux::ws::Payload::Bytes(
                    s.into_bytes().as_slice().into(),
                )),
                WsFrame::Bytes(items) => {
                    Frame::binary(wisp_mux::ws::Payload::Bytes(items.as_slice().into()))
                }
                WsFrame::Close => return Err(WispError::StreamAlreadyClosed),
            })
        }
    }
    #[async_trait::async_trait]
    impl WebSocketWrite for HTTPHandlerOnce {
        async fn wisp_write_frame(&mut self, frame: Frame<'_>) -> Result<(), WispError> {
            self.send_frame(match frame.opcode {
                OpCode::Text => {
                    WsFrame::String(String::from_utf8_lossy(&frame.payload).as_ref().to_owned())
                }
                OpCode::Binary => WsFrame::Bytes(frame.payload.to_vec()),
                _ => todo!(),
            })
            .await;
            Ok(())
        }
        async fn wisp_close(&mut self) -> Result<(), WispError> {
            self.send_frame(WsFrame::Close).await;
            Ok(())
        }
    }
};
