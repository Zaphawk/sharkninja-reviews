import type { Bucket } from "../types";

/**
 * Phrase rules for sorting a negative review into problem areas.
 *
 * These are tuned against the 112 negative reviews in the September 2026
 * export, not invented. Where you see an odd-looking phrase ("wapshi",
 * "kaam nhi kar"), it is because reviewers write in Hinglish and the English
 * keyword misses it entirely.
 *
 * A review can match several buckets — "arrived damaged and nobody replied"
 * is both Delivery/DOA and Customer Service. That is intended.
 */
export type Rule = { bucket: Bucket; patterns: RegExp[] };

export const RULES: Rule[] = [
  {
    bucket: "Product",
    patterns: [
      /stopped? (working|charging|responding)/,
      /not (working|charging)|doesn'?t work|does not work|didn'?t (work|even move)/,
      /no work\b|nahi (chal|kar)|kaam nhi kar|band ho gaya/,
      /defect(ive)?|faulty|malfunction/,
      /\bbattery\b|battery (life|backup|back up)|discharges/,
      /build quality|poor quality|bad quality|quality (issue|lacking)|cheap (product|chinese)/,
      /crack(s|ed)?\b|chip(ped)?\b|handle (was )?loose|paint/,
      /overheat|heats? up|getting overheated/,
      /uneven(ly)? (cook|heat)|cooks? inconsisten|takes very long to cook|burnt|chewy/,
      /doesn'?t (crush|blend|churn)|can'?t crush ice|lumps|blades? (keep|refused)|not churning/,
      /air ?flow|air throw|fan speed|low air flow|speed of air/,
      /doesn'?t (fully )?purify|aqi (doesn'?t|still)|shows? 0\s*%|clean air always|purif(y|ication)/,
      /(power )?cord (length|is )|small wire|short power cord|extension for it|cord length/,
      /too bulky|bulky for|size of fan is small|basket is tiny/,
      /clean(ing)? is (also )?(a )?(hassle|frustrating)|difficult to (clean|remove)|water marks|debris is left/,
      /\bloud\b|noisy|fails to remove odor/,
      /performance (is|was|felt)|below (average|expectations)|far below expectations/,
      /sensor got defective|low quality of sensor/,
      /does not clean|doesn'?t clean|not able to clean/,
      /not switch on|doesn'?t switch on|won'?t turn on|not turning on/,
      /\bit failed\b|product failed/,
      /not a real (steamer|cooker)|can'?t make|cant make/,
      /doesn'?t cover|not for \d+ ?sq|good for \d+ ?(to|-) ?\d+ sq|1400 ?(sq ?)?(ft|feet)/,
      /bought a fan not an air purifier|its fan is working/,
      // Last resort for reviews that name no cause beyond the product itself.
      /(very bad|worst|poor|hopeless|useless|garbage) product|product (is|was) (bad|useless)/,
    ],
  },
  {
    bucket: "Delivery / DOA",
    patterns: [
      /damaged? (piece|product|item|on arrival|paint)|damage item|arrived (damaged|with a broken)/,
      /received? (in )?(broken|damaged|defect)|send damage/,
      /broken (basket|condition|product)/,
      /\bdents?\b|dented/,
      /repacked|re-packed/,
      /used (item|product|one)|looked like (a )?(used|refurbished)|refurbished|clearly used/,
      /scratch(es|ed|y)?\b/,
      /straight out of the box|right out of the box|out of the box/,
    ],
  },
  {
    bucket: "Customer Service",
    patterns: [
      /customer (support|service|care)|after[- ]sales?|aftersales/,
      /service (support|centre|center|guy|persons?)|no service/,
      /(no|poor|bad|worst|useless|zero) (response|support|service)/,
      /not (responding|replying|resolved)|still wasn'?t resolved|no help\b/,
      /unhelpful|kept (following up|rescheduling)|reschedul/,
      /company (completely )?disappeared|no support from the company/,
      /(ninja|shark)( ?ninja)? (support|team|service)/,
      /call ?back|does not bother/,
      /service cent(er|re)s/,
      /automated messages|helpless/,
    ],
  },
  {
    bucket: "Installation / Demo",
    patterns: [
      /installation|install\b|installed/,
      /\bdemo\b|demonstration|virtual demo|onsite (demo|assistance)/,
      /\bslot\b|long queues?|queue for/,
      /no testing|no instructions|instruction manual/,
      /setup|set up the/,
    ],
  },
  {
    bucket: "Returns / Replacement",
    patterns: [
      /\breturn(s|ed|ing)?\b|return window|no return policy/,
      /replace(ment|d)?\b|exchange/,
      /\brefund(ed)?\b/,
      /pick ?up (agent|for return)|no pickup/,
      /warranty/,
      /replacement stock/,
    ],
  },
  {
    bucket: "Marketplace",
    patterns: [
      /not as (described|per what is promised)|does not match the description|description is wrong/,
      /as promised|work as promised|advert(ised|isement)|advetised/,
      /claim(s|ed|ing)?\b|false|misleading|myth\b|fake product features/,
      /marketing|saw ads|\bhype\b|carried away by brand/,
      /overpriced|over ?priced|not worth (the )?(money|price|buying|it|purchase|a penny)/,
      /value for money|waste of (money|the money|time)|west of money|money waste|eate of money|wasted the amount/,
      /expensive|premium price|hefty price|high price|for the price|at this price/,
      /\bseller\b|amazon (support|is not|stop|redirected|is not helping)/,
      /better (options|products|brands)|many companies have better/,
      /\bscam\b|cheat(ing|ed)?\b/,
      /no worth of money|not what (it |is )?mention|does what mentions/,
    ],
  },
];
