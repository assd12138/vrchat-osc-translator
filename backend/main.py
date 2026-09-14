import argparse

import uvicorn
from fastapi import FastAPI


app = FastAPI()


@app.get("/health")
async def health():
    return {
        "ok": True,
    }


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--port",
        type=int,
        required=True,
    )

    args = parser.parse_args()

    uvicorn.run(
        app,
        host="127.0.0.1",
        port=args.port,
    )


if __name__ == "__main__":
    main()