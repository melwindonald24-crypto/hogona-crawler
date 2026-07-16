import natural from 'natural';

const stemmer= natural.PorterStemmer;
class TextNormalizer {
    static normalize(text = '') {
        return String(text)
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .map((word) => stemmer.stem(word));
    }
}
export default TextNormalizer;
