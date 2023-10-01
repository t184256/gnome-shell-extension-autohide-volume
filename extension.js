// SPDX-FileCopyrightText: 2021-2023 Alexander Sosedkin <monk@unboiled.info>
// SPDX-License-Identifier: GPL-3.0-or-later

import GLib from 'gi://GLib';
import {panel} from 'resource:///org/gnome/shell/ui/main.js';


export default class AutohideVolume {
	late_cb = null;
	h_io1 = null;
	h_ic1 = null;
	h_ic2 = null;
	h_ic3 = null;
	h_ic4 = null;
	h_oo1 = null;
	h_oc1 = null;
	h_oc2 = null;

	enable() {
		this.late_cb = GLib.idle_add(
			GLib.PRIORITY_DEFAULT_IDLE,
			(() => {
				let qs = panel.statusArea.quickSettings;
				if (!qs._volumeOutput)
					return GLib.SOURCE_CONTINUE;
				this.late_enable();
				return GLib.SOURCE_REMOVE;
			}).bind(this)
		);
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
			'stream-added', AutohideVolume._autoupdate_visibility
		);
		this.h_ic4 = input._control.connect(
			'stream-removed', AutohideVolume._autoupdate_visibility
		);
		this.h_oo1 = output._output.connect(
			'stream-updated', AutohideVolume._autoupdate_visibility
		);
		this.h_oc1 = output._control.connect(
			'state-changed', AutohideVolume._autoupdate_visibility
		);
		this.h_oc2 = output._control.connect(
			'active-output-update',
			AutohideVolume._autoupdate_visibility
		);
		AutohideVolume._autoupdate_visibility();
	}

	disable() {
		if (this.late_cb) {
			GLib.Source.remove(this.late_cb);
			this.late_cb = null;
		}
		let output = panel.statusArea.quickSettings._volumeOutput;
		let input = panel.statusArea.quickSettings._volumeInput;
		if (this.h_ii1) {
			input._input.disconnect(this.h_ii1);
			this.h_ii1 = null;
		}
		if (this.h_ic1) {
			input._control.disconnect(this.h_ic1);
			this.h_ic1 = null;
		}
		if (this.h_ic2) {
			input._control.disconnect(this.h_ic2);
			this.h_ic2 = null;
		}
		if (this.h_ic3) {
			input._control.disconnect(this.h_ic3);
			this.h_ic3 = null;
		}
		if (this.h_ic4) {
			input._control.disconnect(this.h_ic4);
			this.h_ic4 = null;
		}
		if (this.h_oo1) {
			output._output.disconnect(this.h_ii1);
			this.h_oo1 = null;
		}
		if (this.h_oc1) {
			output._control.disconnect(this.h_ic1);
			this.h_oc1 = null;
		}
		if (this.h_oc2) {
			output._control.disconnect(this.h_ic2);
			this.h_oc2 = null;
		}
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
