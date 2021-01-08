class TransmissionCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  _getTorrents(hass, ttype, sensor_name) {
    var res = [];
    if (typeof hass.states['sensor.' + sensor_name + '_' + ttype + '_torrents'] != "undefined") {
      const data1 = hass.states['sensor.' + sensor_name + '_' + ttype + '_torrents'].attributes['torrent_info'];
      Object.keys(data1 || {}).forEach(function (key) {
        res.push({
          name: key,
          id: data1[key].id,
          percent: parseInt(data1[key].percent_done, 10),
          state: data1[key].status,
          added_date: data1[key].added_date,
          eta: data1[key].eta,
        });
      });
    }
    return res;
  }

  _getGAttributes(hass, sensor_name) {
    if (typeof hass.states['sensor.'+ sensor_name + '_down_speed'] != "undefined") {
      return {
        down_speed: hass.states['sensor.' + sensor_name + '_down_speed'].state,
        down_unit: hass.states['sensor.' + sensor_name + '_down_speed'].attributes['unit_of_measurement'],
        up_speed: hass.states['sensor.' + sensor_name + '_up_speed'].state,
        up_unit: hass.states['sensor.' + sensor_name + '_up_speed'].attributes['unit_of_measurement'],
        status: hass.states['sensor.' + sensor_name + '_status'].state
      }
    }
    return {
      down_speed: undefined,
      up_speed: undefined,
      down_unit: "MB/s",
      up_unit: "MB/s",
      status: "no sensor"
    };
  }

  _toggleTurtle() {
    this.myhass.callService('switch', 'toggle', { entity_id: 'switch.transmission_turtle_mode' });
  }

  _toggleType() {

    const torrent_types = ['total','active','completed','paused','started']

    const currentIndex = torrent_types.indexOf(this._ttype);
    const nextIndex = (currentIndex + 1) % torrent_types.length;
    this._ttype = torrent_types[nextIndex];
  }

  _startStop() {
    this.myhass.callService('switch', 'toggle', { entity_id: 'switch.transmission_switch' });
  }

  setConfig(config) {
    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    if (config.display_mode &&
      !['compact', 'full'].includes(config.display_mode)) {
        throw new Error('display_mode accepts only "compact" and "full" as value');
      }

    const defaultConfig = {
      'no_torrent_label': 'No torrents',
      'hide_turtle': false,
      'hide_startstop': false,
      'hide_type': false,
      'default_type': 'total',
      'display_mode': 'compact',
      'sensor_name': 'transmission',
    }

    this._config = {
      ...defaultConfig,
      ...config
    };
    let { default_type } = this._config;
    this._ttype = default_type;

    const card = document.createElement('ha-card');
    card.setAttribute('header', 'Transmission');
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
#attributes {
  margin-top: 0.4em;
  padding-bottom: 0.8em;
}
.progressbar {
  border-radius: 0.4em;
  margin-bottom: 0.6em;
  height: 1.4em;
  display: flex;
  background-color: #f1f1f1;
  z-index: 0;
  position: relative;
  margin-left: 1.4em;
  margin-right: 1.4em;
}
.progressin {
  border-radius: 0.4em;
  height: 100%;
  z-index: 1;
  position: absolute;
}
.name {
  margin-left: 0.7em;
  width: calc(100% - 60px);
  overflow: hidden;
  z-index: 2;
  color: var(--text-light-primary-color, var(--primary-text-color));
  line-height: 1.4em;
}
.percent {
  vertical-align: middle;
  z-index: 2;
  margin-left: 1.7em;
  margin-right: 0.7em;
  color: var(--text-light-primary-color, var(--primary-text-color));
  line-height: 1.4em;
}
.downloading {
  background-color: var(--paper-item-icon-active-color);
}
.c-Downloading, .c-UpDown {
  color: var(--paper-item-icon-active-color);
}
.seeding {
  background-color: var(--light-primary-color);
}
.c-seeding {
  color: var(--light-primary-color);
}
.stopped {
  background-color: var(--label-badge-grey);
}
.c-idle {
  color: var(--label-badge-grey);
}
.up-color {
  width: 2em;
  color: var(--light-primary-color);
}
.down-color {
  width: 2em;
  color: var(--paper-item-icon-active-color);
  margin-left: 1em;
}

#title {
  position: relative;
  display: inline;
  width: 100%;
}
#title1 {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}
.titleitem {
  width: auto;
  margin-left: 0.7em;
}

.status {
  font-size: 1em;
}
.turtle_off {
  color: var(--light-primary-color);
}
.turtle_on {
  color: var(--paper-item-icon-active-color);
}
.start_on {
  color: var(--light-primary-color);
}
.start_off {
  color: var(--primary-color);
}
.no-torrent {
  margin-left: 1.4em;
}
#ttype {
  background-color: var(--light-primary-color);
  color: var(--text-light-primary-color, var(--primary-text-color));
  border-radius: 0.4em;
  margin-bottom: 0.7em;
  margin-left: 0.7em;
  height: 1.5em;
  line-height: 1.5em;
  display: flex;
  padding-left: 1.3em;
  padding-right: 1em;
  width: auto;
}
.torrents {
  margin-left: 1.4em;
  margin-right: 1.4em;
}
.torrent:not(:last-child) {
  border-bottom: 1px solid var(--divider-color);
}
.torrents .progressbar {
  margin: 0 0 0 0;
  height: 4px;
}
.torrent_name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.torrent_state {
  font-size: 0.7em;
  text-transform: capitalize;
}
.torrent_details {
  font-size: 0.7em;
}
`;
    content.innerHTML = `
      <div id='title'></div>
      <div id='attributes'></div>
    `;
    card.appendChild(style);
    card.appendChild(content);
    root.appendChild(card)
  }

  _updateContent(element, torrents) {
    if (torrents.length > 0) {
      if (this._config.display_mode === 'compact') {
        element.innerHTML = `
        ${torrents.map((torrent) => `
          <div class="progressbar">
            <div class="${torrent.state} progressin" style="width:${torrent.percent}%">
            </div>
            <div class="name">${torrent.name}</div>
            <div class="percent">${torrent.percent}%</div>
          </div>
        `).join('')}
      `;
      } else {
        element.innerHTML = `
        <div class="torrents">
          ${torrents.map((torrent) => `<div class="torrent">
            <div class="torrent_name">${torrent.name}</div>
            <div class="torrent_state">${torrent.state}</div>
            <div class="progressbar">
              <div class="${torrent.state} progressin" style="width:${torrent.percent}%">
              </div>
            </div>
            <div class="torrent_details">${torrent.percent} %</div>
          </div>`).join('')}
        </div>
      `}
    }
    else {
      element.innerHTML = `<div class="no-torrent">${this._config.no_torrent_label}</div>`;
    }
  }

  _updateTitle(element, gattributes, hturtle, hstartstop, htype) {
    element.innerHTML = `
         <div id="title1">
           <div class="status titleitem c-${gattributes.status.replace('/','')}"><p class="txtitem">${gattributes.status}</p></div>
           <div class="titleitem"><ha-icon-button icon="mdi:download" class="down-color"></div>
           <div class="titleitem"><p class="txtitem">${gattributes.down_speed} ${gattributes.down_unit}</p></div>
           <div class="titleitem"><ha-icon-button icon="mdi:upload" class="up-color"></div>
           <div class="titleitem"><p class="txtitem">${gattributes.up_speed} ${gattributes.up_unit}</p></div>
           <div class="titleitem"><ha-icon-button icon="mdi:turtle" title="turtle mode" id="turtle"></ha-icon-button></div>
           <div class="titleitem"><ha-icon-button icon="mdi:stop" title="start/stop all" id="start"></ha-icon-button></div>
           <div><p id="ttype"></p></div>
         </div>
    `;

    const root = this.shadowRoot;

    var ttypeElement = root.getElementById('ttype');
    if ( htype ) {
      ttypeElement.style.display = "none";
    } else {
      ttypeElement.innerHTML = this._ttype;
      ttypeElement.addEventListener('click', this._toggleType.bind(this));
    }

    var turtleElement = root.getElementById('turtle');
    if ( hturtle ) {
      turtleElement.style.display = "none";
    } else {
      turtleElement.addEventListener('click', this._toggleTurtle.bind(this));
      turtleElement.className = "turtle_" + this.myhass.states['switch.transmission_turtle_mode'].state;
    }

    var playStartElement = root.getElementById('start')
    if ( hstartstop ) {
      playStartElement.style.display = "none";
    } else {
      playStartElement.addEventListener('click', this._startStop.bind(this));
      if (this.myhass.states['switch.transmission_switch'].state === "on") {
        playStartElement.icon = "mdi:stop";
      } else {
        playStartElement.icon = "mdi:play";
      }
      playStartElement.className = "start_" + this.myhass.states['switch.transmission_switch'].state;
    }
  }

  set hass(hass) {
    const root = this.shadowRoot;
    //const config = this._config;
    this.myhass = hass;

    let { hide_turtle, hide_startstop, hide_type, sensor_name } = this._config;
    let torrents = this._getTorrents(hass, this._ttype, sensor_name);
    let gattributes = this._getGAttributes(hass, sensor_name);

    this._updateTitle(root.getElementById('title'), gattributes, hide_turtle, hide_startstop, hide_type);
    this._updateContent(root.getElementById('attributes'), torrents);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('transmission-card', TransmissionCard);

// Puts card into the UI card picker dialog
(window).customCards = (window).customCards || [];
(window).customCards.push({
  type: 'transmission-card',
  name: 'Transmission Card',
  preview: true,
  description: 'This Lovelace custom card displays torrents information provided by the Transmission Integration.',
});
