import socket
import threading

from fastapi import FastAPI
from uvicorn import Config, Server
from zeroconf import ServiceInfo, Zeroconf


app = FastAPI()

SERVICE_TYPE = "_vt._tcp.local."
SERVICE_NAME = "M._vt._tcp.local."

zeroconf: Zeroconf | None = None


@app.get("/health")
async def health():
    return {
        "ok": True,
    }


def get_free_port() -> int:
    """
    System will allocate a random free port
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def startBroadcast(port: int):
    global zeroconf

    # addresses 和 port 都是实际业务服务的信息，不是 mDNS 自身端口
    info = ServiceInfo(
        type_=SERVICE_TYPE,
        name=SERVICE_NAME,
        addresses=[socket.inet_aton("127.0.0.1")],
        port=port,
    )

    zeroconf = Zeroconf()
    zeroconf.register_service(info)


def initAPI():
    port = get_free_port()
    startBroadcast(port)
    config = Config(
        app=app,
        host="127.0.0.1",
        port=port,
        log_level="info",
    )

    server = Server(config)

    try:
        server.run()
    finally:
        if zeroconf is not None:
            zeroconf.close()