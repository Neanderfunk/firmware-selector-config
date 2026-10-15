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
  // Erzeugt von werkzeug/anleitungen-verdrahten.py aus
  // https://routersoftware.ffnef.de/anleitungen/index.json (Stand gluon-rampe-installer d57ed28)
  // Nicht von Hand pflegen, sondern das Werkzeug neu laufen lassen.
  devices_info: {
    "AVM": {
      "FRITZ!Box 3370": {"v2 Hynix": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-3370-rev-2-hynix-nand.html", "v2 Micron": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-3370-rev-2-micron-nand.html"},
      "FRITZ!Box 3390": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-3390.html",
      "FRITZ!Box 4020": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-4020.html",
      "FRITZ!Box 4040": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-4040.html",
      "FRITZ!Box 7312": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7312.html",
      "FRITZ!Box 7360": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7360-v2.html"},
      "FRITZ!Box 7360 SL": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7360-sl.html",
      "FRITZ!Box 7362 SL": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7362-sl.html",
      "FRITZ!Box 7412": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7412.html",
      "FRITZ!Box 7430": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7430.html",
      "FRITZ!Box 7520": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7520.html",
      "FRITZ!Box 7530": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-box-7530.html",
      "FRITZ!Repeater 1200": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-repeater-1200.html",
      "FRITZ!Repeater 3000": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-repeater-3000.html",
      "FRITZ!WLAN Repeater 1750E": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-wlan-repeater-1750e.html",
      "FRITZ!WLAN Repeater 300E": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-wlan-repeater-300e.html",
      "FRITZ!WLAN Repeater 450E": "https://routersoftware.ffnef.de/anleitungen/de/avm-fritz-wlan-repeater-450e.html",
    },
    "Aruba": {
      "AP-303": "https://routersoftware.ffnef.de/anleitungen/de/aruba-ap-303.html",
      "AP-303H": "https://routersoftware.ffnef.de/anleitungen/de/aruba-ap-303h.html",
      "AP-365": "https://routersoftware.ffnef.de/anleitungen/de/aruba-ap-365.html",
      "Instant On AP11": "https://routersoftware.ffnef.de/anleitungen/de/aruba-instant-on-ap11.html",
      "Instant On AP11D": "https://routersoftware.ffnef.de/anleitungen/de/aruba-instant-on-ap11d.html",
      "Instant On AP17": "https://routersoftware.ffnef.de/anleitungen/de/aruba-instant-on-ap17.html",
    },
    "Buffalo": {
      "WZR-600DHP": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/buffalo-wzr-600dhp.html"},
      "WZR-HP-AG300H": "https://routersoftware.ffnef.de/anleitungen/de/buffalo-wzr-hp-ag300h.html",
      "WZR-HP-G300NH": {"v1 - rtl8366s": "https://routersoftware.ffnef.de/anleitungen/de/buffalo-wzr-hp-g300nh-rtl8366s.html"},
    },
    "Cudy": {
      "AP3000": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-ap3000-v1.html"},
      "AP3000 Outdoor": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-ap3000-outdoor-v1.html"},
      "M1800": "https://routersoftware.ffnef.de/anleitungen/de/cudy-m1800.html",
      "M3000": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-m3000-v1.html"},
      "RE3000": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-re3000-v1.html"},
      "TR1200": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-tr1200-v1.html"},
      "TR3000-256MB": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-tr3000-256mb-v1.html"},
      "WR1000": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr1000.html"},
      "WR1300": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr1300-v1.html"},
      "WR2100": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr2100.html",
      "WR3000": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr3000-v1.html"},
      "WR3000 E": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr3000e-v1.html"},
      "WR3000 H (AX3000)": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr3000h-v1.html"},
      "WR3000 S": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-wr3000s-v1.html"},
      "X6": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/cudy-x6-v1.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/cudy-x6-v2.html"},
    },
    "D-Link": {
      "Aquila Pro AI M30": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-aquila-pro-ai-m30-a1.html"},
      "Aquila Pro AI M60": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-aquila-pro-ai-m60-a1.html"},
      "COVR-X1860": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-covr-x1860-a1.html"},
      "DAP-1330": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-1330-a1.html"},
      "DAP-1365": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-1365-a1.html"},
      "DAP-1620": {"b1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-1620-b1.html"},
      "DAP-2660": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-2660-a1.html"},
      "DAP-2680": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-2680-a1.html"},
      "DAP-2695": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-2695-a1.html"},
      "DAP-X1860": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dap-x1860-a1.html"},
      "DIR-860L": {"b1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dir-860l-b1.html"},
      "DIR-878": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dir-878-a1.html"},
      "DIR-882": {"a1": "https://routersoftware.ffnef.de/anleitungen/de/d-link-dir-882-a1.html"},
    },
    "FriendlyElec": {
      "NanoPi R2C": "https://routersoftware.ffnef.de/anleitungen/de/friendlyelec-nanopi-r2c.html",
      "NanoPi R2S": "https://routersoftware.ffnef.de/anleitungen/de/friendlyelec-nanopi-r2s.html",
      "NanoPi R3S": "https://routersoftware.ffnef.de/anleitungen/de/friendlyelec-nanopi-r3s.html",
      "NanoPi R4S": "https://routersoftware.ffnef.de/anleitungen/de/friendlyelec-nanopi-r4s.html",
    },
    "GL.iNet": {
      "6416": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-6416.html",
      "GL-AP1300": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ap1300.html",
      "GL-AR150": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ar150.html",
      "GL-AR300M": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ar300m-nor.html",
      "GL-AR300M Lite": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ar300m-lite.html",
      "GL-AR750": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ar750.html",
      "GL-AR750S": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-ar750s-nor.html",
      "GL-B1300": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-b1300.html",
      "GL-E750": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-e750.html",
      "GL-MT1300": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-mt1300.html",
      "GL-MT2500": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-mt2500.html",
      "GL-MT3000": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-mt3000.html",
      "GL-MT300a": "https://routersoftware.ffnef.de/anleitungen/de/gl-mt300a.html",
      "GL-MT300n": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/gl-mt300n.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/gl-mt300n-v2.html"},
      "GL-MT750": "https://routersoftware.ffnef.de/anleitungen/de/gl-mt750.html",
      "GL-USB150": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-usb150.html",
      "GL-XE300": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-gl-xe300.html",
      "VIXMINI": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-vixmini.html",
      "microuter-N300": "https://routersoftware.ffnef.de/anleitungen/de/gl.inet-microuter-n300.html",
    },
    "Genexis": {
      "Pulse EX400": "https://routersoftware.ffnef.de/anleitungen/de/genexis-pulse-ex400.html",
    },
    "Linksys": {
      "EA6350": {"v3": "https://routersoftware.ffnef.de/anleitungen/de/linksys-ea6350v3.html"},
      "EA8300": "https://routersoftware.ffnef.de/anleitungen/de/linksys-ea8300-dallas.html",
    },
    "Mercusys": {
      "MR70X": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/mercusys-mr70x-v1.html"},
    },
    "Netgear": {
      "DGN3500": "https://routersoftware.ffnef.de/anleitungen/de/netgear-dgn3500b.html",
      "EAX12": "https://routersoftware.ffnef.de/anleitungen/de/netgear-eax12.html",
      "EX3700": "https://routersoftware.ffnef.de/anleitungen/de/netgear-ex3700.html",
      "EX6100": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/netgear-ex6100v2.html"},
      "EX6130": "https://routersoftware.ffnef.de/anleitungen/de/netgear-ex6130.html",
      "EX6150": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/netgear-ex6150.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/netgear-ex6150v2.html"},
      "R6020": "https://routersoftware.ffnef.de/anleitungen/de/netgear-r6020.html",
      "R6120": "https://routersoftware.ffnef.de/anleitungen/de/netgear-r6120.html",
      "R6220": "https://routersoftware.ffnef.de/anleitungen/de/netgear-r6220.html",
      "R6260": "https://routersoftware.ffnef.de/anleitungen/de/netgear-r6260.html",
      "R7800": "https://routersoftware.ffnef.de/anleitungen/de/netgear-nighthawk-x4s-r7800.html",
      "WAC104": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wac104.html",
      "WAX202": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wax202.html",
      "WAX206": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wax206.html",
      "WAX220": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wax220.html",
      "WNDR3700": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3700.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3700-v2.html", "v4": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3700-v4.html", "v5": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3700-v5.html"},
      "WNDR3800": {"alle": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3800.html", "ch": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr3800ch.html"},
      "WNDR4300": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndr4300.html",
      "WNDRMAC": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wndrmac-v2.html"},
      "WNR2200": {"16M": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wnr2200-16m.html", "8M": "https://routersoftware.ffnef.de/anleitungen/de/netgear-wnr2200-8m.html"},
    },
    "OpenWrt": {
      "One": "https://routersoftware.ffnef.de/anleitungen/de/openwrt-one.html",
    },
    "PC Engines": {
      "ALIX": "https://routersoftware.ffnef.de/anleitungen/de/x86-geode.html",
    },
    "Raspberry Pi Foundation": {
      "PI1": "https://routersoftware.ffnef.de/anleitungen/de/raspberrypi-model-b.html",
      "PI2": "https://routersoftware.ffnef.de/anleitungen/de/raspberrypi-2-model-b.html",
      "PI3": "https://routersoftware.ffnef.de/anleitungen/de/raspberrypi-3-model-b.html",
      "PI4": "https://routersoftware.ffnef.de/anleitungen/de/raspberrypi-4-model-b.html",
    },
    "TP-Link": {
      "Archer A7": {"v5": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-a7-v5.html"},
      "Archer AX23": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-ax23-v1.html"},
      "Archer C2": {"v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c2-v3.html"},
      "Archer C20i": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c20i.html",
      "Archer C25": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c25-v1.html"},
      "Archer C2600": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c2600.html"},
      "Archer C5": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c5-v1.html"},
      "Archer C50": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c50-v1.html"},
      "Archer C58": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c58-v1.html"},
      "Archer C59": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c59-v1.html"},
      "Archer C6": {"v2 (EU/RU/JP)": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c6-v2-eu-ru-jp.html", "v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c6-v3.html"},
      "Archer C7": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c7-v2.html", "v4": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c7-v4.html", "v5": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-archer-c7-v5.html"},
      "CPE210": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe210-v1.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe210-v2.html", "v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe210-v3.html"},
      "CPE220": {"v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe220-v3.html"},
      "CPE510": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe510-v1.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe510-v2.html", "v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe510-v3.html"},
      "CPE710": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe710-v1.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-cpe710-v2.html"},
      "RE200": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-re200-v2.html", "v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-re200-v3.html", "v4": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-re200-v4.html"},
      "RE500": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-re500-v1.html"},
      "RE650": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-re650-v1.html"},
      "TL-WDR3500": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wdr3500-v1.html"},
      "TL-WDR3600": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wdr3600-v1.html"},
      "TL-WDR4300": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wdr4300-v1.html"},
      "TL-WDR4900": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wdr4900-v1.html"},
      "TL-WR1043N/ND": {"v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr1043nd-v2.html", "v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr1043nd-v3.html", "v4": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr1043nd-v4.html", "v5": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr1043n-v5.html"},
      "TL-WR2543N/ND": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr2543n-nd.html",
      "TL-WR810N": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr810n-v1.html"},
      "TL-WR842N/ND": {"v3": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr842n-v3.html"},
      "TL-WR902AC": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-tl-wr902ac-v1.html"},
      "WBS210": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-wbs210-v1.html", "v2": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-wbs210-v2.html"},
      "WBS510": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/tp-link-wbs510-v1.html"},
    },
    "Totolink": {
      "X5000R": "https://routersoftware.ffnef.de/anleitungen/de/totolink-x5000r.html",
    },
    "Ubiquiti": {
      "EdgeRouter X": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-edgerouter-x.html",
      "EdgeRouter X-SFP": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-edgerouter-x-sfp.html",
      "NanoBeam M5 (XW)": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-nanobeam-m5-xw.html",
      "NanoStation Loco M2 (XW)": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-nanostation-loco-m-xw.html",
      "Swiss Army Knife Ultra": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-swiss-army-knife-ultra.html",
      "UniFi 6 LR": {"v1": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-6-lr-v1.html"},
      "UniFi 6 Lite": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-6-lite.html",
      "UniFi 6+": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-6-plus.html",
      "UniFi AC HD": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-hd.html",
      "UniFi AC LR": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-lr.html",
      "UniFi AC Lite": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-lite.html",
      "UniFi AC Mesh": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-mesh.html",
      "UniFi AC Mesh Pro": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-mesh-pro.html",
      "UniFi AC Pro": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ac-pro.html",
      "UniFi AP Outdoor+": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ap-outdoor+.html",
      "UniFi AP Pro": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-ap-pro.html",
      "UniFi nanoHD": "https://routersoftware.ffnef.de/anleitungen/de/ubiquiti-unifi-nanohd.html",
    },
    "ZyXEL": {
      "NBG6617": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-nbg6617.html",
      "NBG6716": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-nbg6716.html",
      "NWA50AX": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-nwa50ax.html",
      "NWA50AX Pro": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-nwa50ax-pro.html",
      "NWA55AXE": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-nwa55axe.html",
      "WSM20": "https://routersoftware.ffnef.de/anleitungen/de/zyxel-wsm20.html",
    },
    "x86": {
      "generic 32bit": "https://routersoftware.ffnef.de/anleitungen/de/x86-generic.html",
      "generic 64bit": "https://routersoftware.ffnef.de/anleitungen/de/x86-64.html",
      "legacy 32bit": "https://routersoftware.ffnef.de/anleitungen/de/x86-legacy.html",
    },
  },
  // Verdrahtet sind ALLE Seiten, auch die ungeprueften (adorfer 15.10.2026);
  // die Seite selbst sagt oben, wie sicher ihre Angaben sind. Geraete ohne
  // eigene Seite behalten, was devices.js aus dem Upstream mitbringt.
};
