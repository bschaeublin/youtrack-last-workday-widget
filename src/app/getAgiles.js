export default async function (dashboardApi, serviceId) { 
    let result = await dashboardApi.fetch(serviceId, 'api/agiles?fields=id,name,homeUrl,sprints(id,name),currentSprint(id,name),sprintsSettings(disableSprints,explicitQuery)&$top=-1')
    console.log(result);
    return result;
}