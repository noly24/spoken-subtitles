# Spoken Subtitles

A Chrome extension that reads subtitles aloud on streaming websites, making content more accessible for users who prefer audio or have visual impairments.

## Features

- **Universal Compatibility**: Works on Netflix, Hulu, Prime Video, YouTube, and other streaming sites
- **Text-to-Speech**: Converts subtitle text to spoken audio using browser's built-in speech synthesis
- **OCR Fallback**: Includes optical character recognition for sites that render subtitles on canvas
- **Customizable**: Choose from available voices and adjust speech rate
- **Clean Interface**: Simple popup controls without clutter

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (for testing)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## Usage

1. Click the extension icon in your browser toolbar
2. Enable the main toggle
3. Choose your preferred voice and speech rate
4. Visit a supported streaming site
5. Subtitles will be read aloud automatically

### OCR Mode
- Enable "OCR Fallback" for sites with canvas-based captions
- Note: OCR may have lower accuracy and uses more resources

## Supported Sites

- Netflix
- Hulu
- Prime Video
- YouTube
- Disney+
- And other sites with standard subtitle formats (.vtt, .srt, .ass)

## Limitations

- May not work on sites with image-based subtitles (common on some anime platforms)
- OCR accuracy depends on text clarity and styling
- Requires browser support for Web Speech API

## Privacy

This extension only processes subtitle text for accessibility purposes. No data is collected, stored, or transmitted. All processing happens locally in your browser.

## Development

### Prerequisites
- Node.js (for potential build scripts)
- Chrome browser for testing

### Building
The extension is ready to use as-is. No build process required.

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Credits

- Uses [Tesseract.js](https://github.com/naptha/tesseract.js) for OCR functionality (MIT License)
- Icon designed for accessibility

## Support

If you encounter issues or have suggestions:
- Check the [Issues](https://github.com/noly24/spoken-subtitles/issues) page
- Test on multiple sites to isolate problems
- Include browser version and site details in bug reports