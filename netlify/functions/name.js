// netlify/functions/generate-id.js

export const handler = async (event, context) => {
  // クエリパラメータ count
  let count = parseInt(event.queryStringParameters?.count || "1", 10);
  if (count < 1) count = 1;
  if (count > 200) count = 200;

  const words = [
    'red','green','blue','yellow','white','black','gray','silver','gold','cyan',
    'magenta','amber','crimson','navy','lime','teal','violet','indigo','pink','orange',
    'sky','star','moon','sun','cloud','storm','wind','rain','snow','mist','fog','river',
    'lake','mount','hill','forest','meadow','field','stone','rock','sand','ocean','wave',
    'leaf','tree','bloom','flame','ember','dust','shadow','light','thunder','echo','glow',
    'spark','trail','peak','valley','dawn','dusk','horizon','riverbank','canyon','creek',
    'fox','wolf','dog','cat','bird','hawk','eagle','owl','lion','tiger','bear','sparrow',
    'falcon','rabbit','deer','swan','fish','otter','seal','whale','dolphin','penguin','koala',
    'home','base','gate','box','road','path','bridge','pillar','tower','signal','cable',
    'circuit','engine','frame','pixel','byte','code','data','logic','chip','node','server',
    'grid','spark','bolt','flare','panel','wheel','beam','rod','pillar','bench','lamp',
    'alpha','beta','gamma','delta','omega','nova','terra','luna','zen','prime','core',
    'shift','pulse','sync','flux','drive','phase','spirit','dream','vision','focus','scale',
    'origin','limit','range','axis','point','edge','line','circle','sphere','cube','star',
    'fast','slow','soft','hard','deep','high','low','bright','cool','warm','silent','wild',
    'calm','pure','strong','rapid','noble','bold','steady','swift','smooth','gentle','light',
    'fresh','clean','clear','quiet','sharp','kind','happy','lucky','brave','smart','fresh',
    'apple','banana','berry','cherry','cocoa','coffee','tea','honey','lemon','melon',
    'mint','nut','peach','pear','plum','rice','sugar','vanilla','water','candy','cake',
    'bread','juice','cookie','soup','milk','jam','olive','bean','corn','seed',
    'city','village','town','house','cabin','castle','park','garden','bridge','station',
    'harbor','tower','museum','library','school','office','market','street','road','lane',
    'loop','beam','wave','spark','flare','node','core','edge','point','line','path','track',
    'zone','hub','block','net','grid','matrix','pulse','shift','echo','signal','byte','pixel',
    'alpha','beta','prime','terra','nova','luna','zen','focus','vision','dream'
  ];

  const pickWord = () => {
    return words[Math.floor(Math.random() * words.length)];
  };

  const randomIdSegment = (length = 5) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  };

  const generateCfStyleId = () => {
    return `${pickWord()}-${pickWord()}-${randomIdSegment(5)}`;
  };

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(generateCfStyleId());
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
    body: result.join("\n")
  };
};

