/*
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var config = {
  // list images on console that match no model
  listMissingImages: false,
  // see devices.js for different vendor model maps
  vendormodels: vendormodels,
  // set enabled categories of devices (see devices.js)
  enabled_device_categories: ["recommended","ath10k_lowmem","small_kernel_part","legacy_target","8_32","16_32","broken"],
  // Display a checkbox that allows to display not recommended devices.
  // This only make sense if enabled_device_categories also contains not
  // recommended devices.
  recommended_toggle: true,
  // Optional link to an info page about no longer recommended devices
  recommended_info_link: null,
  // community prefix of the firmware images
  community_prefix: /gluon-[a-z]{0,}-{0,1}/i,
  // firmware version regex
  version_regex: '(([0-9][0-9](?:\_)[a-z]+)(?:\-)[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9](?:\sta\-))',

  // Was in der Domaenenauswahl in Klammern steht. Ohne diese Zeile zeigt
  // app.js die ganze gefundene Version, also "18_nefuk-26091920sta-".
  // Gewollt ist nur die Kennung: "18_nefuk". Gegriffen wird die erste
  // Gruppe, deshalb liegt der abschliessende Bindestrich ausserhalb der
  // Klammer - er muss im Ausdruck stehen bleiben, damit die Kennung sicher
  // am Trenner endet, wird aber nicht mit angezeigt.
  // Betrifft nur die Anzeige; intern bleibt die volle Version erhalten.
  prettyPrintVersionRegex: '^([0-9]+_[a-z]+)-',
  // relative image paths and branch
  directories: {
        './images/stable/02_met/sysupgrade/': 'Mettmann',
        './images/stable/02_met/factory/': 'Mettmann',
        './images/stable/10_wlf/sysupgrade/': 'Wülfrath',
        './images/stable/10_wlf/factory/': 'Wülfrath',
        './images/stable/01_vel/sysupgrade/': 'Velbert',
        './images/stable/01_vel/factory/': 'Velbert',
        './images/stable/04_hld/sysupgrade/': 'Hilden',
        './images/stable/04_hld/factory/': 'Hilden',
        './images/stable/07_erk/sysupgrade/': 'Erkrath',
        './images/stable/07_erk/factory/': 'Erkrath',
        './images/stable/06_han/sysupgrade/': 'Haan',
        './images/stable/06_han/factory/': 'Haan',
        './images/stable/03_rat/sysupgrade/': 'Ratingen',
        './images/stable/03_rat/factory/': 'Ratingen',
        './images/stable/08_hlg/sysupgrade/': 'Heiligenhaus',
        './images/stable/08_hlg/factory/': 'Heiligenhaus',
        './images/stable/05_mon/sysupgrade/': 'Monheim',
        './images/stable/05_mon/factory/': 'Monheim',
        './images/stable/09_lgf/sysupgrade/': 'Langenfeld',
        './images/stable/09_lgf/factory/': 'Langenfeld',
        './images/stable/21_dias/factory/': 'Neanderfunk-Diaspora',
        './images/stable/21_dias/sysupgrade/': 'Neanderfunk-Diaspora',
        './images/stable/13_dusfl/sysupgrade/': 'Düsseldorf Flingern',
        './images/stable/13_dusfl/factory/': 'Düsseldorf Flingern',
        './images/stable/14_bar/sysupgrade/': 'Wuppertal Barmen',
        './images/stable/14_bar/factory/': 'Wuppertal Barmen',
        './images/stable/15_mrh/sysupgrade/': 'Marieneheide',
        './images/stable/15_mrh/factory/': 'Marienheide',
        './images/stable/16_gmb/sysupgrade/': 'Gummersbach',
        './images/stable/16_gmb/factory/': 'Gummersbach',
        './images/stable/17_wip/sysupgrade/': 'Wipperfürth',
        './images/stable/17_wip/factory/': 'Wipperfürth',
        './images/stable/30_sol/sysupgrade/': 'Solingen',
        './images/stable/30_sol/factory/': 'Solingen',
        './images/stable/39_sin/sysupgrade/': 'Siegen Nord',
        './images/stable/39_sin/factory/': 'Siegen Nord',
        './images/stable/40_sim/sysupgrade/': 'Siegen Mitte',
        './images/stable/40_sim/factory/': 'Siegen Mitte',
        './images/stable/41_sis/sysupgrade/': 'Siegen Süd',
        './images/stable/41_sis/factory/': 'Siegen Süd',
        './images/stable/42_siwil/sysupgrade/': 'Siegen-Wittgenstein Land',
        './images/stable/42_siwil/factory/': 'Siegen-Wittgenstein Land',
        './images/stable/43_bggl/sysupgrade/': 'Bergisch-Gladbach',
        './images/stable/43_bggl/factory/': 'Bergisch-Gladbach',
        './images/stable/44_llng/sysupgrade/': 'Leichlingen',
        './images/stable/44_llng/factory/': 'Leichlingen',
        './images/stable/45_brsd/sysupgrade/': 'Burscheid',
        './images/stable/45_brsd/factory/': 'Burscheid',
        './images/stable/46_odth/sysupgrade/': 'Odenthal',
        './images/stable/46_odth/factory/': 'Odenthal',
        './images/stable/47_roes/sysupgrade/': 'Rösrath',
        './images/stable/47_roes/factory/': 'Rösrath',
        './images/stable/48_rdvw/sysupgrade/': 'Radevormwald',
        './images/stable/48_rdvw/factory/': 'Radevormwald',
        './images/stable/12_dusuk/sysupgrade/': 'Düsseldorf Unterkünfte',
        './images/stable/12_dusuk/factory/': 'Düsseldorf Unterkünfte',
        './images/stable/22_dusukn/factory/': 'Düsseldorf Unterkünfte Nord',
        './images/stable/22_dusukn/sysupgrade/': 'Düsseldorf Unterkünfte Nord',
        './images/stable/23_dusuks/factory/': 'Düsseldorf Unterkünfte Süd',
        './images/stable/23_dusuks/sysupgrade/': 'Düsseldorf Unterkünfte Süd',
        './images/stable/24_dusukw/factory/': 'Düsseldorf Unterkünfte West',
        './images/stable/24_dusukw/sysupgrade/': 'Düsseldorf Unterkünfte West',
        './images/stable/18_nefuk/sysupgrade/': 'Neanderfunk Unterkünfte',
        './images/stable/18_nefuk/factory/': 'Neanderfunk Unterkünfte',
        './images/stable/37_siwin/sysupgrade/': 'Siegen-Wittgenstein Nord',
        './images/stable/37_siwin/factory/': 'Siegen-Wittgenstein Nord',
        './images/stable/38_siwiw/sysupgrade/': 'Siegen-Wittgenstein West',
        './images/stable/38_siwiw/factory/': 'Siegen-Wittgenstein West',
        './images/stable/11_lvr/sysupgrade/': 'LVR',
        './images/stable/11_lvr/factory/': 'LVR',
        './images/stable/31_lvrno/sysupgrade/': 'LVR NordOst',
        './images/stable/31_lvrno/factory/': 'LVR NordOst',
        './images/stable/32_lvrnw/sysupgrade/': 'LVR NordWest',
        './images/stable/32_lvrnw/factory/': 'LVR NordWest',
        './images/stable/33_lvrmo/sysupgrade/': 'LVR MitteOst',
        './images/stable/33_lvrmo/factory/': 'LVR MitteOst',
        './images/stable/34_lvrmw/sysupgrade/': 'LVR MitteWest',
        './images/stable/34_lvrmw/factory/': 'LVR MitteWest',
        './images/stable/35_lvrso/sysupgrade/': 'LVR SüdOst',
        './images/stable/35_lvrso/factory/': 'LVR SüdOst',
        './images/stable/36_lvrsw/sysupgrade/': 'LVR SüdWest',
        './images/stable/36_lvrsw/factory/': 'LVR SüdWest',
        './images/stable/19_agi/sysupgrade/': 'Inkubator Agi',
        './images/stable/19_agi/factory/': 'Inkubator Agi',
        './images/stable/20_grt/sysupgrade/': 'Inkubator Gerti',
        './images/stable/20_grt/factory/': 'Inkubator Gerti',

},
  // page title
  title: 'Freifunk-Router Firmware Neanderfunk',
  // branch descriptions shown during selection
  branch_descriptions: {
    stable: 'Gut getestet, zuverlässig und stabil.',
  },
  // recommended branch will be marked during selection
  recommended_branch: 'stable',
  // experimental branches (show a warning for these branches)
  experimental_branches: ['experimental'],
  // path to preview pictures directory
  preview_pictures: 'pictures/',
  preview_pictures_ext: '.svg',
  // link to changelog
  changelog: 'https://github.com/Neanderfunk/firmware/blob/v2023.2.x/docs/release-notes-2023.2.6.md',
  // links for instructions like flashing of certain devices (optional)
  // can be set for a whole model or individual revisions
  // overwrites default values from devices_info in devices.js
  // devices_info: {
  //   'AVM': {
  //     "FRITZ!Box 4040": "https://fritz-tools.readthedocs.io"
  //   },
  //   "TP-Link": {
  //     "TL-WR841N/ND": {"v13": "https://wiki.freifunk.net/TP-Link_WR841ND/Flash-Anleitung_v13"}
  //   }
  // }
};
