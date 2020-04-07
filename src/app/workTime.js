
export default function toYoutrackFormat(minutes, minutesAday, daysAWeek) {
    var units = {
        "y": minutesAday * daysAWeek * 30 * 365,
        "w": minutesAday * daysAWeek,
        "d": minutesAday,
        "h": 1 * 60,
        "m": 1
    }

    var result = []

    for(var name in units) {
      let p =  Math.floor(minutes/units[name]);
      if(p >= 1) {
        result.push(`${p}${name}`);
      }
    
      minutes %= units[name]
    }

    return result.join('')
}



