// SPDX-FileCopyrightText: 2021-2023 Alexander Sosedkin <monk@unboiled.info>
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';
import {panel} from 'resource:///org/gnome/shell/ui/main.js';


export default class AutohideVolume {
	h_io1;
	h_ic1;
	h_ic2;
	h_ic3;
	h_ic4;
	h_oo1;
	h_oc1;
	h_oc2;

	init() {}

	enable() {
		GLib.idle_add(GLib.PRIORITY_DEFAULT, (() => {
		    if (!panel.statusArea.quickSettings._volumeOutput)
			return GLib.SOURCE_CONTINUE;
		    this.late_enable();
		    return GLib.SOURCE_REMOVE;
		}).bind(this));
	}

	late_enable() {
		let input = panel.statusArea.quickSettings._volumeInput;
		let output = panel.statusArea.quickSettings._volumeOutput;
		this.h_ii1 = input._input.connect(
			'stream-updated', AutohideVolume._autoupdate_visibility
		);
		this.h_ic1 = input._control.connect(
			'state-changed', AutohideVolume._autoupdate_visibility
		);
		this.h_ic2 = input._control.connect(
			'active-input-update',
			AutohideVolume._autoupdate_visibility
		);
		this.h_ic3 = input._control.connect(
			'stream-added',
			AutohideVolume._autoupdate_visibility
		);
		this.h_ic4 = input._control.connect(
			'stream-removed',
			AutohideVolume._autoupdate_visibility
		);
		this.h_oo1 = output._output.connect(
			'stream-updated', AutohideVolume._autoupdate_visibility
		);
		this.h_oc1 = output._control.connect(
			'state-changed',
			AutohideVolume._autoupdate_visibility
		);
		this.h_oc2 = output._control.connect(
			'active-output-update',
			AutohideVolume._autoupdate_visibility
		);
		AutohideVolume._autoupdate_visibility();
	}

	disable() {
		let output = panel.statusArea.quickSettings._volumeOutput;
		let input = panel.statusArea.quickSettings._volumeInput;
		if (this.h_ii1) input._input.disconnect(this.h_ii1);
		if (this.h_ic1) input._control.disconnect(this.h_ic1);
		if (this.h_ic2) input._control.disconnect(this.h_ic2);
		if (this.h_ic3) input._control.disconnect(this.h_ic3);
		if (this.h_ic4) input._control.disconnect(this.h_ic4);
		if (this.h_oo1) output._output.disconnect(this.h_ii1);
		if (this.h_oc1) output._control.disconnect(this.h_ic1);
		if (this.h_oc2) output._control.disconnect(this.h_ic2);
		AutohideVolume._set_visibility(true);
	}

	static _set_visibility(show) {
		let output = panel.statusArea.quickSettings._volumeOutput;
		if (show) {
			output.show();
		} else {
			output.hide();
		}
	}

	static _autoupdate_visibility() {
		let output = panel.statusArea.quickSettings._volumeOutput;
		let input = panel.statusArea.quickSettings._volumeInput;
		let input_visible = input.visible;

		let output_muted = false;
		try {
			output_muted = output._output._stream.is_muted;
		} catch (e) {}  // fall back to displaying the icon

		try {
			AutohideVolume._set_visibility(
				!output_muted || input_visible
			);
		} catch (e) {
			logError(e, 'ExtensionErrorType');
		}
	}
}
