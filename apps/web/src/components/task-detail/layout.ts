// Prompt 03 fixes the detail page at a 760 main column beside a 320 rail. The class strings stay literal so Tailwind can see them; the numbers exist for tests.
export const DETAIL_MAIN_PX = 760;
export const DETAIL_RAIL_PX = 320;
export const detailColumnsClass = "grid grid-cols-[minmax(0,760px)_320px] gap-8 px-6 py-5";
export const detailRailClass = "w-[320px]";
