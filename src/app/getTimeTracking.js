import toYoutrackFormat from './workTime';

export default async function (dashboardApi, query = '', serviceId) {
  let worItems = await dashboardApi.fetch(serviceId, `api/workItems?$top=-1&fields=author(id,name),duration(minutes)&query=${query}`)
  let grouped = groupByUser(worItems);
  let data = [];

  for(let userId in grouped) {
    let spentTime = 0;
    for(let i = 0; i < grouped[userId].length; i++) {
      spentTime += grouped[userId][i].duration.minutes;
    }

    let p = {
      userName: grouped[userId][0].author.name,
      spentTime: spentTime,
      spentTimeDisplay: toYoutrackFormat(spentTime, 60 * 7, 5)
    }
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

