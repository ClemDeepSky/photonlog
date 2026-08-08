export type Telescope = {
  name: string;
  aperture: number; // mm
  focal: number; // mm
};

// Optiques les plus fréquentes en astrophotographie
export const TELESCOPE_CATALOG: Telescope[] = [
  // Lunettes apochromatiques
  { name: "Askar FRA300 Pro", aperture: 60, focal: 300 },
  { name: "Askar FRA400", aperture: 72, focal: 400 },
  { name: "Askar FRA500", aperture: 90, focal: 500 },
  { name: "Askar 107PHQ", aperture: 107, focal: 749 },
  { name: "William Optics RedCat 51", aperture: 51, focal: 250 },
  { name: "William Optics RedCat 71", aperture: 71, focal: 350 },
  { name: "William Optics ZenithStar 61", aperture: 61, focal: 360 },
  { name: "William Optics ZenithStar 73", aperture: 73, focal: 430 },
  { name: "William Optics GT81", aperture: 81, focal: 478 },
  { name: "Sky-Watcher Evostar 72ED", aperture: 72, focal: 420 },
  { name: "Sky-Watcher Evostar 80ED", aperture: 80, focal: 600 },
  { name: "Sky-Watcher Esprit 80ED", aperture: 80, focal: 400 },
  { name: "Sky-Watcher Esprit 100ED", aperture: 100, focal: 550 },
  { name: "Sky-Watcher Esprit 120ED", aperture: 120, focal: 840 },
  { name: "Sky-Watcher Evolux 62ED", aperture: 62, focal: 400 },
  { name: "Sky-Watcher Evolux 82ED", aperture: 82, focal: 530 },
  { name: "Takahashi FSQ-85EDX", aperture: 85, focal: 450 },
  { name: "Takahashi FSQ-106EDX4", aperture: 106, focal: 530 },
  { name: "Takahashi FS-60CB", aperture: 60, focal: 355 },
  { name: "Takahashi TOA-130", aperture: 130, focal: 1000 },
  { name: "TS-Optics Photoline 80/480", aperture: 80, focal: 480 },
  { name: "TS-Optics Photoline 130/910", aperture: 130, focal: 910 },
  { name: "Explore Scientific ED80", aperture: 80, focal: 480 },
  { name: "Explore Scientific ED127", aperture: 127, focal: 952 },
  { name: "Radian Raptor 61", aperture: 61, focal: 275 },
  { name: "Stellarvue SVX080T", aperture: 80, focal: 480 },
  { name: "Vixen FL55SS", aperture: 55, focal: 300 },
  // Newtons
  { name: "Sky-Watcher 130 PDS", aperture: 130, focal: 650 },
  { name: "Sky-Watcher 150 PDS", aperture: 150, focal: 750 },
  { name: "Sky-Watcher 200 PDS", aperture: 200, focal: 1000 },
  { name: "Sky-Watcher 250 PDS", aperture: 254, focal: 1200 },
  { name: "Sky-Watcher Quattro 150P", aperture: 150, focal: 600 },
  { name: "Sky-Watcher Quattro 200P (f/4)", aperture: 200, focal: 800 },
  { name: "Sky-Watcher Quattro 250P (f/4)", aperture: 254, focal: 1000 },
  { name: "TS-Optics ONTC 8\" f/4", aperture: 200, focal: 800 },
  { name: "Orion 8\" f/3.9 Astrograph", aperture: 203, focal: 800 },
  { name: "Lacerta Fotonewton 200/800", aperture: 200, focal: 800 },
  // Ritchey-Chrétien / Cassegrain
  { name: "GSO / TS RC6 (f/9)", aperture: 152, focal: 1370 },
  { name: "GSO / TS RC8 (f/8)", aperture: 203, focal: 1624 },
  { name: "GSO / TS RC10 (f/8)", aperture: 254, focal: 2000 },
  { name: "Celestron C6 SCT", aperture: 150, focal: 1500 },
  { name: "Celestron C8 SCT", aperture: 203, focal: 2032 },
  { name: "Celestron C9.25 SCT", aperture: 235, focal: 2350 },
  { name: "Celestron C11 SCT", aperture: 280, focal: 2800 },
  { name: "Celestron EdgeHD 8\"", aperture: 203, focal: 2032 },
  { name: "Celestron EdgeHD 9.25\"", aperture: 235, focal: 2350 },
  { name: "Celestron EdgeHD 11\"", aperture: 280, focal: 2800 },
  { name: "Celestron RASA 8 (f/2)", aperture: 203, focal: 400 },
  { name: "Celestron RASA 11 (f/2.2)", aperture: 279, focal: 620 },
  { name: "Sky-Watcher Skymax 127 Mak", aperture: 127, focal: 1500 },
  { name: "Sky-Watcher Skymax 180 Mak", aperture: 180, focal: 2700 },
  // Compacts / astrographes
  { name: "Askar V (FMA180 Pro)", aperture: 40, focal: 180 },
  { name: "Sharpstar 61EDPH III", aperture: 61, focal: 335 },
  { name: "Sharpstar 15028HNT", aperture: 150, focal: 420 },
  { name: "Officina Stellare Hiper APO", aperture: 154, focal: 616 },
  // Objectifs photo courants
  { name: "Samyang / Rokinon 135mm f/2", aperture: 67, focal: 135 },
  { name: "Canon EF 200mm f/2.8", aperture: 71, focal: 200 },
  { name: "Sigma 105mm f/1.4 Art", aperture: 75, focal: 105 },
  { name: "Nikon 300mm f/4", aperture: 75, focal: 300 },
];

export const findTelescope = (name?: string | null) =>
  name ? TELESCOPE_CATALOG.find((t) => t.name === name) : undefined;
