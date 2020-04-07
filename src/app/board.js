export function areSprintsEnabled(board) {
    const sprintsSettings = board && board.sprintsSettings;
    return sprintsSettings ? !sprintsSettings.disableSprints : false;
  }
  
  export function isCurrentSprint(sprint) {
    const now = Date.now();
    return sprint.start < now && sprint.finish > now;
  }