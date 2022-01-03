export default {
        filters: [
                {
                        name: 'blur',
                        label: 'Blur',
                        filter: "blur(2px)",
                        image_url: require('../resources/filters/blur.png'),
                },
                {
                        name: 'sepia',
                        label: 'Sepia',
                        filter: "sepia(100)",
                        image_url: require('../resources/filters/sepia.png'),
                },
                {
                        name: 'grey',
                        label: 'Grey',
                        filter: "grayscale(80%)",
                        image_url: require('../resources/filters/grey.png'),
                },
                {
                        name: 'contrast',
                        label: 'Contrast',
                        filter: "contrast(150%)",
                        image_url: require('../resources/filters/contrast.png'),
                },
                {
                        name: 'fade',
                        label: 'Fade',
                        filter: "blur(0.2px) brightness(110%) hue-rotate(5deg) saturate(0.5) opacity(85%)",
                        //                         filter: "blur('0.2px'),brightness(110%),hue-rotate('5deg') opacity(0.9) saturate(1.3) sepia(40)",

                        image_url: require('../resources/filters/fade.png'),
                },
                {
                        name: 'invert',
                        label: 'Invert',
                        filter: "invert(100%) hue-rotate(90deg)",
                        image_url: require('../resources/filters/invert.png'),
                }
        ],
};
