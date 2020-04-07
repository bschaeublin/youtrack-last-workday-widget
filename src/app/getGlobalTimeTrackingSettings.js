
export default async function (dashboardApi, serviceId) {
   let settings = await dashboardApi.fetch(serviceId, `api/admin/timeTrackingSettings/workTimeSettings?fields=daysAWeek,firstDatOfWeek,minutesADay,workDays`)
   return settings;
}