import toYoutrackFormat from './workTime';

export default async function (dashboardApi, query, serviceId, workTimeSettings, dates, warningMinutes) {
  let worItems = await dashboardApi.fetch(serviceId, `api/workItems?$top=-1&fields=author(id,fullName,avatarUrl),duration(minutes)&query=${query}&start=${dates.startDate}&end=${dates.endDate}`)
  let grouped = groupByUser(worItems);
  let data = [];
  let w = workTimeSettings;
  let url = (window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0)
  ? window.location.ancestorOrigins[window.location.ancestorOrigins.length -1]
  : window.location;

  console.log('url', url, window.location);
  for(let userId in grouped) {
    let spentTime = 0;
    for(let i = 0; i < grouped[userId].length; i++) {
      spentTime += grouped[userId][i].duration.minutes;
    }

    let p = {
      userName: grouped[userId][0].author.fullName,
      spentTime: spentTime,
      spentTimeDisplay: toYoutrackFormat(spentTime, w.minutesADay, w.workDays.length),
      avatar: `${url}${grouped[userId][0].author.avatarUrl}`,
      exceedThreshold: (spentTime + warningMinutes < w.minutesADay)
    }
    console.log('p',p, w.minutesADay, spentTime + warningMinutes);
    data.push(p);
  }

  console.log('workitems', data);
  return data;
}

var groupByUser = function(xs) {
  return xs.reduce(function(rv, x) {
    (rv[x.author.id] = rv[x.author.id] || []).push(x);
    return rv;
  }, {});
};

