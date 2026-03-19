function separate(fullMap, lockedIndices) {
  const freeItems = [];
  const freeIndices = [];

  fullMap.forEach((item, index) => {
    if (!lockedIndices.includes(index)) {
      freeIndices.push(index);
      if (item) {
        freeItems.push(item);
      }
    }
  });

  return { freeItems, freeIndices };
}

function fillBack(fullMap, freeItems, freeIndices) {
  const resultMap = [...fullMap];

  freeIndices.forEach((targetIndex, index) => {
    resultMap[targetIndex] = index < freeItems.length ? freeItems[index] : null;
  });

  return resultMap;
}

export function shuffleSeat(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);

  for (let index = freeItems.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));
    [freeItems[index], freeItems[nextIndex]] = [freeItems[nextIndex], freeItems[index]];
  }

  return fillBack(fullMap, freeItems, freeIndices);
}

export function sortByHeight(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);
  freeItems.sort((left, right) => (Number(left.height) || 0) - (Number(right.height) || 0));
  return fillBack(fullMap, freeItems, freeIndices);
}

export function sortByScore(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);
  freeItems.sort((left, right) => (Number(right.score) || 0) - (Number(left.score) || 0));
  return fillBack(fullMap, freeItems, freeIndices);
}

export function sortByVision(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);

  freeItems.sort((left, right) => {
    const leftVision = left.vision ? parseFloat(left.vision) : 5.3;
    const rightVision = right.vision ? parseFloat(right.vision) : 5.3;
    return leftVision - rightVision;
  });

  return fillBack(fullMap, freeItems, freeIndices);
}

export function tutoringMode(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);

  freeItems.sort((left, right) => (Number(right.score) || 0) - (Number(left.score) || 0));

  const pairedList = [];
  let leftIndex = 0;
  let rightIndex = freeItems.length - 1;

  while (leftIndex <= rightIndex) {
    if (leftIndex === rightIndex) {
      pairedList.push(freeItems[leftIndex]);
    } else {
      pairedList.push(freeItems[leftIndex]);
      pairedList.push(freeItems[rightIndex]);
    }

    leftIndex += 1;
    rightIndex -= 1;
  }

  return fillBack(fullMap, pairedList, freeIndices);
}

export function tutoringAndHeight(fullMap, lockedIndices, colsPerRow = 8) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);

  if (freeItems.length <= 1) {
    return fillBack(fullMap, freeItems, freeIndices);
  }

  freeItems.sort((left, right) => (Number(left.height) || 0) - (Number(right.height) || 0));

  const finalItems = [];

  for (let index = 0; index < freeItems.length; index += colsPerRow) {
    const rowGroup = freeItems.slice(index, index + colsPerRow);
    rowGroup.sort((left, right) => (Number(right.score) || 0) - (Number(left.score) || 0));

    const rowPaired = [];
    let leftIndex = 0;
    let rightIndex = rowGroup.length - 1;

    while (leftIndex <= rightIndex) {
      if (leftIndex === rightIndex) {
        rowPaired.push(rowGroup[leftIndex]);
      } else {
        rowPaired.push(rowGroup[leftIndex]);
        rowPaired.push(rowGroup[rightIndex]);
      }

      leftIndex += 1;
      rightIndex -= 1;
    }

    finalItems.push(...rowPaired);
  }

  return fillBack(fullMap, finalItems, freeIndices);
}

export function genderBalance(fullMap, lockedIndices) {
  const { freeItems, freeIndices } = separate(fullMap, lockedIndices);
  const boys = freeItems.filter((student) => student.gender === '男');
  const girls = freeItems.filter((student) => student.gender === '女');
  const others = freeItems.filter((student) => !['男', '女'].includes(student.gender));
  const result = [];

  const maxLength = Math.max(boys.length, girls.length);
  for (let index = 0; index < maxLength; index += 1) {
    if (boys[index]) {
      result.push(boys[index]);
    }
    if (girls[index]) {
      result.push(girls[index]);
    }
  }

  result.push(...others);

  return fillBack(fullMap, result, freeIndices);
}

export function rotateSeats(fullMap, lockedIndices, step = 2) {
  const { freeIndices } = separate(fullMap, lockedIndices);
  if (freeIndices.length === 0) {
    return [...fullMap];
  }

  const content = freeIndices.map((index) => fullMap[index]);
  const realStep = step % content.length;
  const rotated = [
    ...content.slice(content.length - realStep),
    ...content.slice(0, content.length - realStep),
  ];
  const resultMap = [...fullMap];

  freeIndices.forEach((targetIndex, index) => {
    resultMap[targetIndex] = rotated[index];
  });

  return resultMap;
}
