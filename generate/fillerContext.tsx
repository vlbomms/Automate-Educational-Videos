// this is so that we don't get import errors for other compositions.
export const generateFillerContext = (videoMode: VideoMode) => {
	switch (videoMode) {
		case 'normal':
			return `

            export const rapper: string = 'SPONGEBOB';
            export const imageBackground: string = '/rap/SPONGEBOB.png';
            `;
		default:
			return '';
	}
};
