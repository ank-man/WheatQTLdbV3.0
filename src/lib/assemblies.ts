// GENERATED - regenerate with `python3 scripts/fetch_assemblies.py`.
//
// Wheat QTL are reported against whichever reference assembly was current when
// the study ran, and those assemblies are NOT interchangeable: RefSeq v2.1 is
// 159 Mb longer than v1.0 overall, chromosome 6D differs by 4.6% and 3B by
// 21 Mb. A base-pair position is therefore only meaningful together with its
// assembly, and comparing positions across assemblies without conversion is an
// error - which `sameAssembly()` below exists to catch.

export interface Assembly {
  accession: string
  name: string
  cultivar: string
  year: number
  /** Chinese Spring reference assemblies most QTL are reported against. */
  primary: boolean
  lengths: Record<string, number>
}

export const ASSEMBLIES: Record<string, Assembly> = {
  'IWGSC RefSeq v1.0': {
    accession: 'GCA_900519105.1',
    name: 'IWGSC RefSeq v1.0',
    cultivar: 'Chinese Spring',
    year: 2018,
    primary: true,
    lengths: {
      '1A': 594102056,
      '1B': 689851870,
      '1D': 495453186,
      '2A': 780798557,
      '2B': 801256715,
      '2D': 651852609,
      '3A': 750843639,
      '3B': 830829764,
      '3D': 615552423,
      '4A': 744588157,
      '4B': 673617499,
      '4D': 509857067,
      '5A': 709773743,
      '5B': 713149757,
      '5D': 566080677,
      '6A': 618079260,
      '6B': 720988478,
      '6D': 473592718,
      '7A': 736706236,
      '7B': 750620385,
      '7D': 638686055,
    },
  },
  'IWGSC RefSeq v2.1': {
    accession: 'GCA_018294505.1',
    name: 'IWGSC RefSeq v2.1',
    cultivar: 'Chinese Spring',
    year: 2021,
    primary: true,
    lengths: {
      '1A': 598660471,
      '1B': 700547350,
      '1D': 498638509,
      '2A': 787782082,
      '2B': 812755788,
      '2D': 656544405,
      '3A': 754128162,
      '3B': 851934019,
      '3D': 619618552,
      '4A': 754227511,
      '4B': 673810255,
      '4D': 518332611,
      '5A': 713360525,
      '5B': 714697677,
      '5D': 569951140,
      '6A': 622669697,
      '6B': 731188232,
      '6D': 495380293,
      '7A': 744491536,
      '7B': 764072961,
      '7D': 642921167,
    },
  },
  'Kariega v1': {
    accession: 'GCA_910594105.1',
    name: 'Kariega v1',
    cultivar: 'Kariega',
    year: 2021,
    primary: false,
    lengths: {
      '1A': 613662638,
      '1B': 717109572,
      '1D': 504659958,
      '2A': 794474755,
      '2B': 817712742,
      '2D': 662526948,
      '3A': 760111594,
      '3B': 864624966,
      '3D': 633282846,
      '4A': 769810128,
      '4B': 701857263,
      '4D': 534651777,
      '5A': 715684684,
      '5B': 726425509,
      '5D': 584285409,
      '6A': 623890083,
      '6B': 738041677,
      '6D': 507261758,
      '7A': 755457679,
      '7B': 767912069,
      '7D': 659687352,
      'UA': 224073253,
    },
  },
  'Renan v2.1': {
    accession: 'GCA_937894285.1',
    name: 'Renan v2.1',
    cultivar: 'Renan',
    year: 2022,
    primary: false,
    lengths: {
      '1A': 593930347,
      '1B': 702775664,
      '1D': 494594617,
      '2A': 792837209,
      '2B': 812232696,
      '2D': 661835603,
      '3A': 750337041,
      '3B': 854463248,
      '3D': 623248023,
      '4A': 749950614,
      '4B': 673746810,
      '4D': 520815567,
      '5A': 712547961,
      '5B': 703299309,
      '5D': 569771178,
      '6A': 620176429,
      '6B': 717542863,
      '6D': 493761083,
      '7A': 746502734,
      '7B': 752612656,
      '7D': 648661963,
    },
  },
  'Paragon v1': {
    accession: 'GCA_949126075.2',
    name: 'Paragon v1',
    cultivar: 'Paragon',
    year: 2025,
    primary: false,
    lengths: {
      '1A': 599230268,
      '1B': 709345803,
      '1D': 499575344,
      '2A': 795989443,
      '2B': 809120074,
      '2D': 670531570,
      '3A': 759055895,
      '3B': 872909281,
      '3D': 637083831,
      '4A': 765902670,
      '4B': 688536368,
      '4D': 533804092,
      '5A': 714878730,
      '5B': 728610199,
      '5D': 586077705,
      '6A': 622419581,
      '6B': 733835468,
      '6D': 506756789,
      '7A': 759450946,
      '7B': 768174826,
      '7D': 658836432,
    },
  },
}

/** The assembly assumed when a record does not state one. Most of the curated
 *  corpus predates v2.1, so v1.0 is the safer default - but it IS an
 *  assumption, surfaced in the UI rather than hidden. */
export const DEFAULT_ASSEMBLY = 'IWGSC RefSeq v1.0'

export function assemblyFor(name?: string | null): Assembly | null {
  if (!name) return ASSEMBLIES[DEFAULT_ASSEMBLY] ?? null
  return ASSEMBLIES[name] ?? null
}

/** How much two assemblies differ on one chromosome, as a fraction. Used to
 *  tell a user how wrong an uncorrected cross-assembly comparison would be. */
export function lengthDelta(a: string, b: string, chromosome: string): number | null {
  const A = ASSEMBLIES[a]?.lengths[chromosome]
  const B = ASSEMBLIES[b]?.lengths[chromosome]
  if (!A || !B) return null
  return (B - A) / A
}

export function sameAssembly(a?: string | null, b?: string | null): boolean {
  return (a || DEFAULT_ASSEMBLY) === (b || DEFAULT_ASSEMBLY)
}

