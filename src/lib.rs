#![no_std]

use core::{future::poll_fn, task::Poll};

use alloc::{borrow::ToOwned, string::String, vec::Vec};
use itertools::Itertools;
use whisk::Channel;
extern crate alloc;
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug)]
pub enum WsFrame {
    String(String),
    Bytes(Vec<u8>),
}
impl WsFrame {
    pub fn from_bytes_iter(mut a: &mut (dyn Iterator<Item = u8> + '_)) -> Option<Self> {
        let a = &mut a;
        let flags = a.next()?;
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
            WsFrame::String(s) => s.as_bytes(),
            WsFrame::Bytes(items) => items.as_ref(),
        };
        let flags = match self {
            WsFrame::String(_) => 0x1,
            WsFrame::Bytes(items) => 0x0,
        };
        [flags]
            .into_iter()
            .chain(u32::to_be_bytes((cb.len() & 0xffff_ffff) as u32))
            .chain(cb.iter().cloned())
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
