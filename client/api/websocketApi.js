export function myFunc() {
  console.log('Hello');
}
export function onMessage(event) {}

export function onOpen(socket) {
  console.log('Successfully connected');
  socket.send('Hi from client!');
}

export function onClose(event) {
  console.log('Socket closed connection', event);
}

export function onError(error) {
  console.log('Socket error', error);
}
