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
      backgroundColor: '#fffff5',
      borderColor: 'lightblue',
      borderWidth: 1,
      // padding: 10,
      width: device.width * 0.45,
      height: device.height * 0.85,
    },
    canvasBox: {
      width: device.width * 0.45,
      height: device.height * 0.85,
    },
    generatedImageBox: {
      aspectRatio: 1,
      borderWidth: 10,
      borderColor: 'lightblue',

      width: device.width * 0.6,
      height: device.width * 0.6,
    },
    generatedImage: {
      width: device.width * 0.6,
      height: device.width * 0.6,
    },
    functionButton: {
      padding: 4,
      borderRadius: 5,
    },
  };
}
