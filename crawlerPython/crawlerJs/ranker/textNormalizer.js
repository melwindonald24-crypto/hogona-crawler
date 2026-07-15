import natural from 'natural';

const stemmer= natural.PorterStemmer;
class TextNormalizer {
    static  name(params) {
        
    } normalize(text='')
    {
        return text.toLowerCase().
        replace(/[^a-z0-9\s]/g, '').
        split(/\s+/).
        map(word=>stemmer.stem(word));

    }
}
export default TextNormalizer;