#!/usr/bin/env python
import asyncio
from websockets.asyncio.server import serve

async def echo(websocket):
    # Iterate over incoming messages as they arrive
    async for message in websocket:
        print(f"Received from client: {message}")
        await websocket.send(f"Echo: {message}")

async def main():
    # Start the WebSocket server
    async with serve(echo, "localhost", 8765) as server:
        print("Server running on ws://localhost:8765")
        await server.serve_forever() # Keep running indefinitely

if __name__ == "__main__":
    asyncio.run(main())
