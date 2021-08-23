import { autocrop } from "jimp";

export function generateStyle(device) {
  return {
    container: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'skyblue',
    },

    drawBox: {
      backgroundColor: 'lightblue',
      borderColor: 'blue',
      borderWidth: 2,
      // padding: 10,
    },
    drawBoxInner: {
      backgroundColor: 'lightblue',
      borderColor: 'blue',
      borderWidth: 2,
      // padding: 10,
      width: Math.min(device.width * 0.75, device.height * 0.75),
      height: Math.min(device.width * 0.75, device.height * 0.75),
    },
    canvasBox: {
      width: Math.min(device.width * 0.75, device.height * 0.75),
      height: Math.min(device.width * 0.75, device.height * 0.75),
    },
    generatedImageBox: {
      aspectRatio: 1,
      borderWidth: 10,
      borderColor: 'lightblue',

      width: Math.min(device.width * 0.75, device.height * 0.75),
      height: Math.min(device.width * 0.75, device.height * 0.75),
    },
    generatedImage: {
      width: Math.min(device.width * 0.75, device.height * 0.75),
      height: Math.min(device.width * 0.75, device.height * 0.75),
    },
    functionButton: {
      padding: 4,
      borderRadius: 5,
    },
  };
}
