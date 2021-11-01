import { autocrop } from "jimp";

export function generateStyle(device) {
  return {
    drawBox: {
      borderColor: 'black',
      borderWidth: 2,
      // padding: 10,
      position: 'absolute',
      top: 0,
      left: 0,
    },
    drawBoxInner: {
      backgroundColor: 'transparent',
      borderColor: '#fffef5',
      borderWidth: 8,
      position:"absolute", left: 0, top: 0,
      // padding: 10,
      width: device.width * 0.33,
      height: device.width * 0.33,
      userDrag: 'none',
      userSelect: 'none'
    },
  };
}
