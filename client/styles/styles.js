export function hello() {
  console.log('Hellodd');
}
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
      aspectRatio: 1,
      backgroundColor: 'white',
      borderColor: 'lightblue',
      borderWidth: 0,
      padding: 10,
      width: device.width * 0.6,
      height: device.width * 0.6,
    },
    canvasBox: {
      width: device.width * 0.6,
      height: device.width * 0.6,
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
