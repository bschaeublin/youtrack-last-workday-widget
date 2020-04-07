  export function areSprintsEnabled(board) {
    const sprintsSettings = board && board.sprintsSettings;
    return sprintsSettings ? !sprintsSettings.disableSprints : false;
  }
  
  export function isCurrentSprint(sprint) {
    const now = Date.now();
    return sprint.start < now && sprint.finish > now;
  }

  function addDays(day, days) {
    let date = new Date(day.valueOf());
    date.setDate(date.getDate() + days);
    return date;
  }

  export function getLastWorkDate(workDays) {
    // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday,
    // workdays ex. = [1,2,3,4,5]
    // workdays ex2. = [1,3,5]

    let now = new Date();
    let lastWorkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    let day = new Date().getDay(); // 2

    let iWorkDays = workDays.indexOf(day);
    let previousWorkDay = 0;
    if (iWorkDays > 0) {
      // there is a previous work day
      previousWorkDay = workDays[iWorkDays - 1]; // 1
    } 
    else if (iWorkDays === 0) {
      // is first day of week, so get the last day of the week 
      previousWorkDay = workDays[workDays.length - 1]; // 5
    }
    else {
      // today is not a workday, so get the previous
      let index = workDays.findIndex(wd => wd < day)
      if (index < 0) {
        index = workDays[workDays.length - 1];
      }
      previousWorkDay = workDays[index];
    }

    while(day !== previousWorkDay) {
      lastWorkDate = addDays(lastWorkDate, -1);
      day = lastWorkDate.getDay();
    }

    let endDate = new Date(lastWorkDate.getFullYear(), lastWorkDate.getMonth(), lastWorkDate.getDate(), 23, 59, 59);
    return { startDate: lastWorkDate.getTime(), endDate: endDate.getTime() };
  }



  