import messageKinds from '../constants/messageKinds.js';
export function myFunc() {
  console.log('Hello');
}
export function onReceiveStroke(event) {}

export function sendStrokeStart(socket, point, color, thickness) {
  socket.send(
    JSON.stringify({
      kind: messageKinds.MESSAGE_STROKE_START,
      data: {
        point: point,
        color: color,
        thickness: thickness,
      },
      }),
  );
  console.log('Sent start stroke message');
}

export function sendStrokeEnd(socket, color, thickness) {
  socket.send(
    JSON.stringify({
      kind: messageKinds.MESSAGE_STROKE_END,
      data: {
        color: color,
        thickness: thickness,
      },
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

  socket.send(JSON.stringify(data));
}

export function sendSwitchBrush(socket, type) {
  console.log("send switch")
  var data = {
    kind: messageKinds.MESSAGE_SWITCH_BRUSH,
    brushType: type
  };
  socket.send(JSON.stringify(data));
}

export function sendSwitchFilter(socket, type,name) {
  console.log("send filter switch")
  var data = {
    kind: messageKinds.MESSAGE_SWITCH_FILTER,
    filterType: type,
    filterName: name
  }
  socket.send(JSON.stringify(data));

}

export function sendSwitchUserBrush(socket, type, color) {
  var data = {
    kind: messageKinds.MESSAGE_SWITCH_USER_BRUSH,
    userBrushType: type,
    color: color
  }
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
