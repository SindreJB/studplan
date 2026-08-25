export function currentSemester(date = new Date()) {
  return `${String(date.getFullYear()).slice(-2)}${date.getMonth() < 6 ? "v" : "h"}`;
}

export function semesterOptions(date = new Date()) {
  const currentIndex = date.getFullYear() * 2 + (date.getMonth() < 6 ? 0 : 1);
  const lastIndex = (date.getFullYear() + 1) * 2 + 1;
  return Array.from({ length: lastIndex - currentIndex + 1 }, (_, index) => {
    const semesterIndex = lastIndex - index;
    const year = Math.floor(semesterIndex / 2);
    const spring = semesterIndex % 2 === 0;
    return {
      value: `${String(year).slice(-2)}${spring ? "v" : "h"}`,
      label: `${spring ? "Spring" : "Autumn"} ${year}`,
    };
  });
}
