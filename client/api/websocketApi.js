import messageKinds from '../constants/messageKinds.js';
export function myFunc() {
  console.log('Hello');
}
export function onReceiveStroke(event) {}

export function sendStrokeStart(socket, data) {
  socket.send(
    JSON.stringify({
      kind: messageKinds.MESSAGE_STROKE_START,
    }),
  );
  console.log('Sent start stroke message');
}

export function sendStrokeEnd(socket) {
  socket.send(
    JSON.stringify({
      kind: messageKinds.MESSAGE_STROKE_END,
    }),
  );
  console.log('Sent end stroke message');
}

export function sendStroke(socket, point, color, thickness) {
  var data = {
    kind: messageKinds.MESSAGE_STROKE,
    data: {
      point: point,
      color: color,
      thickness: thickness,
    },
  };
  console.log(JSON.stringify(data));

  socket.send(JSON.stringify(data));
}

export function onOpen(socket, data) {
  console.log('Successfully connected');
  socket.send(
    JSON.stringify({
      kind: messageKinds.MESSAGE_CLIENT_SEND_INFO,
      data: {
        canvasWidth: data.canvasWidth,
        canvasHeight: data.canvasHeight,
      },
    }),
  );
}

export function onClose(event) {
  console.log('Socket closed connection', event);
}

export function onError(error) {
  console.log('Socket error', error);
}
