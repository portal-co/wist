use crate::*;
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
impl<H: SHTTP<Error: Into<WispError>> + Send> WebSocketRead for WsHandler<H> {
    async fn wisp_read_frame(
        &mut self,
        tx: &LockedWebSocketWrite,
    ) -> Result<Frame<'static>, WispError> {
        let r = self.recv().await.map_err(|a| a.into())?;
        Ok(match r {
            WsFrame::String(s) => Frame::text(wisp_mux::ws::Payload::Bytes(
                s.into_bytes().as_slice().into(),
            )),
            WsFrame::Bytes(items) => {
                Frame::binary(wisp_mux::ws::Payload::Bytes(items.as_slice().into()))
            }
            WsFrame::Close => Frame::close(wisp_mux::ws::Payload::Borrowed(&[])),
        })
    }
}
#[async_trait::async_trait]
impl<H: SHTTP<Error: Into<WispError>> + Send> WebSocketWrite for WsHandler<H> {
    async fn wisp_write_frame(&mut self, frame: Frame<'_>) -> Result<(), WispError> {
        self.send(match frame.opcode {
            OpCode::Text => {
                WsFrame::String(String::from_utf8_lossy(&frame.payload).as_ref().to_owned())
            }
            OpCode::Binary => WsFrame::Bytes(frame.payload.to_vec()),
            OpCode::Close => WsFrame::Close,
            _ => todo!(),
        });
        Ok(())
    }
    async fn wisp_close(&mut self) -> Result<(), WispError> {
        self.close().await.map_err(|a| a.into())
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
            WsFrame::Close => Frame::close(wisp_mux::ws::Payload::Borrowed(&[])),
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
            OpCode::Close => WsFrame::Close,
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
