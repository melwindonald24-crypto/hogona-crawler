
const BLACKLIST_KEYWORDS=new set([
    "about-us",
    "contact-us",
    "privacy-policy",
    "terms-of-service", 
    "terms-and-conditions",
    "login",
    "signup",
    "register",
    "disclaimer",
    "faq",
    "help", 
    "support",
    "careers",
    "jobs",
    "contact",
    "advertise",
    "advertising",
    "about",
    "terms",

])

class CrawlFilter {
    static isBlacklisted(url) 
        {
            const parsedURL=new URL(url);
            const segments=parsedURL.pathname.split('/').filter(Boolean);
            for(const segment in segments)
            {
                if(BLACKLIST_KEYWORDS.has(segment))
                {
                    return true;
                }
            }
            return false;
        }

}
export default CrawlFilter;