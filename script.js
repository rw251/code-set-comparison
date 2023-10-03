const $popup = document.getElementById('popup');
const $q = $popup.querySelector('div > p');
const $lhtogButton = document.getElementById('lhtoggle');
const $rhtogButton = document.getElementById('rhtoggle');
const $cancelButton = document.getElementById('cancel');
const $lhstats = document.getElementById('lhstats');
const $rhstats = document.getElementById('rhstats');

const LHS = 'LHS';
const RHS = 'RHS';
const TEMP = 'TEMP';
let currentSide = false;
const tables = {};
tables[LHS] = document.getElementById('lhtable');
tables[RHS] = document.getElementById('rhtable');
tables[TEMP] = document.getElementById('poptable');
tables[LHS].originalHTML = tables[LHS].innerHTML;
tables[RHS].originalHTML = tables[RHS].innerHTML;

let lhCommon = 0;
let rhCommon = 0;

const codesets = {};
codesets[LHS] = [];
codesets[RHS] = [];
codesets[TEMP] = [];

const inputs = {};
inputs[LHS] = document.getElementById('lhs');
inputs[RHS] = document.getElementById('rhs');

let codeIndex = -1;
let descIndex = -1;
let lhCommonVisibility = 0;
let rhCommonVisibility = 0;
const toggleText = ['Hide matching rows', 'Show matching rows'];
const VISIBILITY = ['collapse', 'visible'];

$cancelButton.addEventListener('click', (e) => {
  hidePopup();
});

document.onkeydown = function (evt) {
  evt = evt || window.event;
  var isEscape = false;
  if ('key' in evt) {
    isEscape = evt.key === 'Escape' || evt.key === 'Esc';
  } else {
    isEscape = evt.keyCode === 27;
  }
  if (isEscape) {
    hidePopup();
  }
};

$lhtogButton.addEventListener('click', () => {
  document.documentElement.style.setProperty(
    '--lh-common-visibility',
    VISIBILITY[lhCommonVisibility]
  );
  lhCommonVisibility = 1 - lhCommonVisibility;
  $lhtogButton.innerText = toggleText[lhCommonVisibility];
});

$rhtogButton.addEventListener('click', () => {
  document.documentElement.style.setProperty(
    '--rh-common-visibility',
    VISIBILITY[rhCommonVisibility]
  );
  rhCommonVisibility = 1 - rhCommonVisibility;
  $rhtogButton.innerText = toggleText[rhCommonVisibility];
});

tables[TEMP].addEventListener('click', (e) => {
  const cell = e.target.closest('td');
  if (!cell) {
    return;
  } // Quit, not clicked on a cell
  if (codeIndex < 0) {
    codeIndex = cell.cellIndex;
    $q.innerText =
      'Now click to select the column which contains the descriptions.';
  } else {
    descIndex = cell.cellIndex;
    $q.innerText = '';
    codesets[currentSide] = codesets[TEMP].map((x) => {
      return { code: x[codeIndex], description: x[descIndex] };
    });
    displayCodeset(currentSide, codesets[currentSide]);
    hidePopup();
  }
});

inputs[LHS].select();

function parsePastedContent(content) {
  let rowCount = 0;
  let numElCount = -1;
  const codesetBits = content
    .replace(/\\r/g, '') // remove windows style carriage returns
    .trim() // remove leading and trailing spaces
    .split('\n') // split into lines
    .map((x) => {
      // split into cells based on tab char, then remove all whitespace surrounding
      const bits = x.split(/\t+/).map((x) => x.trim().split(/\s+/).join(' '));

      rowCount++;
      if (numElCount < 0) numElCount = bits.length;
      // first time so see how many fields the first row has
      else {
        if (numElCount !== bits.length) {
          // TODO should probably error here rather than silently continuing
          console.log(
            `Row ${rowCount} contains ${bits.length} fields (tab delimited), but the previous rows had ${numElCount} fields.`
          );
        }
      }
      return bits;
    });
  if (numElCount === 2) {
    // Only 2 fields per row, so assume it's CODE DESCRIPTION
    const codeset = codesetBits.map(([code, description]) => {
      return { code, description };
    });
    return { codeset, hasMoreThan2Fields: false };
  } else {
    // More than 2 fields so must choose which to use
    return { codeset: codesetBits, hasMoreThan2Fields: true };
  }
}

function getPasteContent(pasteEvent) {
  pasteEvent.preventDefault();
  const content = pasteEvent.clipboardData.getData('text');
  return content;
}

[LHS, RHS].forEach((side) => {
  inputs[side].addEventListener('paste', (e) => {
    tables[side].innerHTML = tables[side].originalHTML;
    const content = getPasteContent(e);
    const { codeset, hasMoreThan2Fields } = parsePastedContent(content);
    if (!hasMoreThan2Fields) {
      codesets[side] = codeset;
      displayCodeset(side, codesets[side]);
    } else {
      codesets[TEMP] = codeset;
      displayCodeset(TEMP, codeset);
      $q.innerText =
        'Click to select the column which contains the clinical codes.';
      currentSide = side;
      showPopup();
    }
  });
});

function showPopup() {
  $popup.style.display = 'block';
}
function hidePopup() {
  codeIndex = -1;
  descIndex = -1;
  $popup.style.display = 'none';
}

function displayCodeset(side, codeset) {
  tables[side].deleteTHead();
  var head = tables[side].createTHead();
  var headerRow = head.insertRow(-1);
  var h1 = headerRow.insertCell(0);
  var h2 = headerRow.insertCell(1);

  if (codeset[0].code) {
    h1.innerHTML = 'Code';
    h2.innerHTML = 'Description';
  } else {
    h1.innerHTML = `col1`;
    h2.innerHTML = `col2`;
    for (let i = 2; i < codeset[0].length; i++) {
      const h = headerRow.insertCell(i);
      h.innerHTML = `col${i + 1}`;
    }
  }

  var body = tables[side].createTBody();
  codeset.forEach((x) => {
    // Create an empty <tr> element and add it to the 1st position of the table:
    var row = body.insertRow(-1);

    // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);

    // Add some text to the new cells:
    if (x.code) {
      cell1.innerHTML = x.code;
      cell2.innerHTML = x.description;
    } else {
      cell1.innerHTML = x[0];
      cell2.innerHTML = x[1];
      for (let i = 2; i < x.length; i++) {
        const cell = row.insertCell(i);
        cell.innerHTML = x[i];
      }
    }
  });
  if (side === LHS) {
    compareCodesets();
    inputs[RHS].placeholder = 'Paste the second code set here...';
    inputs[RHS].select();
  } else if (side === RHS) {
    compareCodesets();
    inputs[LHS].select();
  }
}

function compareCodesets() {
  lhCommon = 0;
  rhCommon = 0;
  const codes = {};
  codes[LHS] = codesets[LHS].map((x) => x.code);
  codes[RHS] = codesets[RHS].map((x) => x.code);
  codes[LHS].forEach((code, i) => {
    if (codes[RHS].indexOf(code) > -1) {
      tables[LHS].rows[i + 1].classList.add('in-other');
      lhCommon += 1;
    } else {
      tables[LHS].rows[i + 1].classList.remove('in-other');
    }
  });
  codes[RHS].forEach((code, i) => {
    if (codes[LHS].indexOf(code) > -1) {
      tables[RHS].rows[i + 1].classList.add('in-other');
      rhCommon += 1;
    } else tables[RHS].rows[i + 1].classList.remove('in-other');
  });
  $lhstats.querySelector(
    'span'
  ).innerText = `${codes[LHS].length} codes. ${lhCommon} of which in other set.`;
  $rhstats.querySelector(
    'span'
  ).innerText = `${codes[RHS].length} codes. ${rhCommon} of which in other set.`;
  $lhstats.style.display = codes[LHS].length > 0 ? 'flex' : 'none';
  $rhstats.style.display = codes[RHS].length > 0 ? 'flex' : 'none';
}
