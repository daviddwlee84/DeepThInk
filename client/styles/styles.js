import { autocrop } from "jimp";

export function generateStyle(device) {
  return {
    // container: {
    //   flex: 1,
    //   flexDirection: 'column',
    //   alignItems: 'center',
    //   justifyContent: 'center',
    //   backgroundColor: 'white',
    // },

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
      width: Math.min(device.width * 0.85, device.height * 0.85),
      height: Math.min(device.width * 0.85, device.height * 0.85),
    },
    // canvasBox: {
    //   width: Math.min(device.width * 0.75, device.height * 0.75),
    //   height: Math.min(device.width * 0.75, device.height * 0.75),
    // },
    // generatedImageBox: {
    //   aspectRatio: 1,
    //   borderWidth: 10,
    //   borderColor: 'lightblue',

    //   width: Math.min(device.width * 0.75, device.height * 0.75),
    //   height: Math.min(device.width * 0.75, device.height * 0.75),
    // },
    // generatedImage: {
    //   width: Math.min(device.width * 0.75, device.height * 0.75),
    //   height: Math.min(device.width * 0.75, device.height * 0.75),
    // },
    // functionButton: {
    //   padding: 4,
    //   borderRadius: 5,
    // },
  };
}
