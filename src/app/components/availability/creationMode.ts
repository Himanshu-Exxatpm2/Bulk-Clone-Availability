// How a bulk clone job reports back. Which one the real system supports depends on how fast the
// create call is, and is still to be confirmed with the tech team, so the prototype has both:
//   inline  (default): the wizard stays open and shows each availability being created, then the summary.
//   submit: the wizard closes at once with "request submitted"; the job runs behind the scenes, a
//           banner on the Availability list shows it is underway and then how it ended, and the
//           banner opens the job in Bulk Creation History.
// Open the prototype with ?creation=submit to try the second one. The two are never mixed.
export type CreationMode = 'inline' | 'submit';

// Read once when the app loads: moving between pages drops the query string.
function readMode(): CreationMode {
  try {
    const fromSearch = new URLSearchParams(window.location.search).get('creation');
    const hash = window.location.hash;
    const fromHash = hash.includes('?') ? new URLSearchParams(hash.slice(hash.indexOf('?'))).get('creation') : null;
    return (fromSearch ?? fromHash) === 'submit' ? 'submit' : 'inline';
  } catch {
    return 'inline';
  }
}

const MODE = readMode();

export function creationMode(): CreationMode {
  return MODE;
}
