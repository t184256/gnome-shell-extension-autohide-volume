// SPDX-FileCopyrightText: 2021-2022 Alexander Sosedkin <monk@unboiled.info>
// SPDX-License-Identifier: GPL-3.0-or-later

const Main = imports.ui.main;
let h1, h2;


function init() {}

function enable() {
	let menu;
	if (Main.panel.statusArea.quickSettings) {
		menu = Main.panel.statusArea.quickSettings._volume;
		h2 = menu._input.connect('stream-updated', _autoupdate_visibility);
	} else {
		menu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
		h2 = menu.connect('input-visible-changed', _autoupdate_visibility);
	}
	h1 = menu._output.connect('stream-updated', _autoupdate_visibility);
	_autoupdate_visibility();
}

function disable() {
	let menu;
	if (Main.panel.statusArea.quickSettings) {
		menu = Main.panel.statusArea.quickSettings._volume;
		menu._input.disconnect(h2);
	} else {
		menu = Main.panel.statusArea.aggregateMenu._volume._volumeMenu;
		menu.disconnect(h2);
	}
	menu._output.disconnect(h1);
	_set_visibility(true);
}

function _set_visibility(show) {
	let volume;
	if (Main.panel.statusArea.quickSettings) {
		volume = Main.panel.statusArea.quickSettings._volume;
	} else {
		volume = Main.panel.statusArea.aggregateMenu._volume;
	}
	if (show) {
		volume.show();
	} else {
		volume.hide();
	}
}

function _autoupdate_visibility() {
	let volume;
	let menu;
	if (Main.panel.statusArea.quickSettings) {
		volume = Main.panel.statusArea.quickSettings._volume;
		menu = volume;
	} else {
		volume = Main.panel.statusArea.aggregateMenu._volume;
		menu = volume._volumeMenu;
	}
	let input_visible = volume._inputIndicator.visible;

	let output_muted = false;
	try {
		output_muted = menu._output._stream.is_muted;
	} catch (e) {}  // fall back to displaying the icon

	try {
		_set_visibility(!output_muted || input_visible);
	} catch (e) {
		logError(e, 'ExtensionErrorType');
	}
}
