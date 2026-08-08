export type CameraSpec = {
  name: string;
  brand: string;
  sensor: string;
  pixelSize: number; // µm
  widthPx: number;
  heightPx: number;
};

export const CAMERA_CATALOG: CameraSpec[] = [
  // ZWO
  { name: "ZWO ASI2600MM Pro", brand: "ZWO", sensor: "IMX571", pixelSize: 3.76, widthPx: 6248, heightPx: 4176 },
  { name: "ZWO ASI2600MC Pro", brand: "ZWO", sensor: "IMX571", pixelSize: 3.76, widthPx: 6248, heightPx: 4176 },
  { name: "ZWO ASI6200MM Pro", brand: "ZWO", sensor: "IMX455", pixelSize: 3.76, widthPx: 9576, heightPx: 6388 },
  { name: "ZWO ASI6200MC Pro", brand: "ZWO", sensor: "IMX455", pixelSize: 3.76, widthPx: 9576, heightPx: 6388 },
  { name: "ZWO ASI533MC Pro", brand: "ZWO", sensor: "IMX533", pixelSize: 3.76, widthPx: 3008, heightPx: 3008 },
  { name: "ZWO ASI533MM Pro", brand: "ZWO", sensor: "IMX533", pixelSize: 3.76, widthPx: 3008, heightPx: 3008 },
  { name: "ZWO ASI294MC Pro", brand: "ZWO", sensor: "IMX294", pixelSize: 4.63, widthPx: 4144, heightPx: 2822 },
  { name: "ZWO ASI294MM Pro", brand: "ZWO", sensor: "IMX492", pixelSize: 2.315, widthPx: 8288, heightPx: 5644 },
  { name: "ZWO ASI1600MM Pro", brand: "ZWO", sensor: "IMX/Panasonic MN34230", pixelSize: 3.8, widthPx: 4656, heightPx: 3520 },
  { name: "ZWO ASI183MC Pro", brand: "ZWO", sensor: "IMX183", pixelSize: 2.4, widthPx: 5496, heightPx: 3672 },
  { name: "ZWO ASI183MM Pro", brand: "ZWO", sensor: "IMX183", pixelSize: 2.4, widthPx: 5496, heightPx: 3672 },
  { name: "ZWO ASI178MM", brand: "ZWO", sensor: "IMX178", pixelSize: 2.4, widthPx: 3096, heightPx: 2080 },
  { name: "ZWO ASI174MM", brand: "ZWO", sensor: "IMX174", pixelSize: 5.86, widthPx: 1936, heightPx: 1216 },
  { name: "ZWO ASI120MM Mini", brand: "ZWO", sensor: "AR0130CS", pixelSize: 3.75, widthPx: 1280, heightPx: 960 },
  { name: "ZWO ASI220MM Mini", brand: "ZWO", sensor: "IMX462", pixelSize: 2.9, widthPx: 1920, heightPx: 1080 },
  { name: "ZWO ASI462MC", brand: "ZWO", sensor: "IMX462", pixelSize: 2.9, widthPx: 1936, heightPx: 1096 },
  { name: "ZWO ASI585MC", brand: "ZWO", sensor: "IMX585", pixelSize: 2.9, widthPx: 3840, heightPx: 2160 },
  { name: "ZWO ASI664MC", brand: "ZWO", sensor: "IMX664", pixelSize: 2.9, widthPx: 3840, heightPx: 2160 },
  { name: "ZWO ASI715MC", brand: "ZWO", sensor: "IMX715", pixelSize: 1.45, widthPx: 3864, heightPx: 2180 },
  { name: "ZWO ASI2400MC Pro", brand: "ZWO", sensor: "IMX410", pixelSize: 5.94, widthPx: 6072, heightPx: 4042 },
  { name: "ZWO ASI071MC Pro", brand: "ZWO", sensor: "IMX071", pixelSize: 4.78, widthPx: 4944, heightPx: 3284 },
  // QHY
  { name: "QHY268M", brand: "QHY", sensor: "IMX571", pixelSize: 3.76, widthPx: 6280, heightPx: 4210 },
  { name: "QHY268C", brand: "QHY", sensor: "IMX571", pixelSize: 3.76, widthPx: 6280, heightPx: 4210 },
  { name: "QHY600M", brand: "QHY", sensor: "IMX455", pixelSize: 3.76, widthPx: 9576, heightPx: 6388 },
  { name: "QHY294M Pro", brand: "QHY", sensor: "IMX492", pixelSize: 2.315, widthPx: 8288, heightPx: 5644 },
  { name: "QHY183M", brand: "QHY", sensor: "IMX183", pixelSize: 2.4, widthPx: 5544, heightPx: 3684 },
  { name: "QHY163M", brand: "QHY", sensor: "MN34230", pixelSize: 3.8, widthPx: 4656, heightPx: 3522 },
  { name: "QHY5III178M", brand: "QHY", sensor: "IMX178", pixelSize: 2.4, widthPx: 3072, heightPx: 2048 },
  { name: "QHY5III462C", brand: "QHY", sensor: "IMX462", pixelSize: 2.9, widthPx: 1920, heightPx: 1080 },
  { name: "QHY533M", brand: "QHY", sensor: "IMX533", pixelSize: 3.76, widthPx: 3008, heightPx: 3008 },
  // Player One
  { name: "Player One Poseidon-M (IMX571)", brand: "Player One", sensor: "IMX571", pixelSize: 3.76, widthPx: 6252, heightPx: 4176 },
  { name: "Player One Poseidon-C (IMX571)", brand: "Player One", sensor: "IMX571", pixelSize: 3.76, widthPx: 6252, heightPx: 4176 },
  { name: "Player One Artemis-C (IMX294)", brand: "Player One", sensor: "IMX294", pixelSize: 4.63, widthPx: 4164, heightPx: 2796 },
  { name: "Player One Uranus-C (IMX585)", brand: "Player One", sensor: "IMX585", pixelSize: 2.9, widthPx: 3856, heightPx: 2180 },
  { name: "Player One Neptune-C II (IMX464)", brand: "Player One", sensor: "IMX464", pixelSize: 2.9, widthPx: 2712, heightPx: 1538 },
  { name: "Player One Ceres-M (IMX290)", brand: "Player One", sensor: "IMX290", pixelSize: 2.9, widthPx: 1920, heightPx: 1080 },
  // Atik / Altair / Touptek
  { name: "Atik 460EX", brand: "Atik", sensor: "ICX694", pixelSize: 4.54, widthPx: 2749, heightPx: 2199 },
  { name: "Atik 383L+", brand: "Atik", sensor: "KAF-8300", pixelSize: 5.4, widthPx: 3362, heightPx: 2504 },
  { name: "Altair Hypercam 269C", brand: "Altair", sensor: "IMX269", pixelSize: 4.0, widthPx: 4128, heightPx: 3008 },
  { name: "Touptek ATR2600M", brand: "Touptek", sensor: "IMX571", pixelSize: 3.76, widthPx: 6252, heightPx: 4176 },
  // Reflex / hybrides
  { name: "Canon EOS 6D (plein format)", brand: "Canon", sensor: "CMOS FF", pixelSize: 6.55, widthPx: 5472, heightPx: 3648 },
  { name: "Canon EOS 800D / 200D (APS-C)", brand: "Canon", sensor: "CMOS APS-C", pixelSize: 3.72, widthPx: 6000, heightPx: 4000 },
  { name: "Canon EOS Ra (plein format)", brand: "Canon", sensor: "CMOS FF", pixelSize: 5.36, widthPx: 6720, heightPx: 4480 },
  { name: "Nikon D5300 (APS-C)", brand: "Nikon", sensor: "CMOS APS-C", pixelSize: 3.92, widthPx: 6000, heightPx: 4000 },
  { name: "Nikon D810A (plein format)", brand: "Nikon", sensor: "CMOS FF", pixelSize: 4.88, widthPx: 7360, heightPx: 4912 },
  { name: "Sony A7 III (plein format)", brand: "Sony", sensor: "CMOS FF", pixelSize: 5.94, widthPx: 6000, heightPx: 4000 },
];

export const findCamera = (name: string | null | undefined) =>
  CAMERA_CATALOG.find((c) => c.name === name);
