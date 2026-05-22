{ description = "Autohide volume indicator when muted";

  inputs.nixpkgs.url =
    "github:NixOS/nixpkgs/8e13ad6266acf92aa1c61d006f51a30c53d43851";

  outputs = { self, nixpkgs, ... }:
    let system = "x86_64-linux";
        pkgs = import nixpkgs { inherit system; };

        metadata = builtins.fromJSON (builtins.readFile ../metadata.json);
        maxShellVersion = nixpkgs.lib.last metadata.shell-version;
        nixpkgsShellVersion = nixpkgs.lib.versions.major
          pkgs.gnome-shell.version;

        extension = pkgs.stdenv.mkDerivation {
          pname = "gnome-shell-extension-autohide-volume";
          version = "unstable";
          src = ../.;
          installPhase = ''
            EXT_DIR=$out/share/gnome-shell/extensions/
            EXT_DIR+="autohide-volume@unboiled.info"
            mkdir -p "$EXT_DIR"
            cp extension.js metadata.json "$EXT_DIR/"
          '';
        };

        makeTest = generateMode:
          assert nixpkgsShellVersion == maxShellVersion;
          let timeoutMultiplier = 1;  # Bump for slower CI machines
          in nixpkgs.lib.nixos.runTest {
            name = "autohide-volume${if generateMode then "-generate" else ""}";
            hostPkgs = pkgs;
            globalTimeout = 120 * timeoutMultiplier;
            nodes.machine = { pkgs, ... }: {
              users.users.user.isNormalUser = true;
              environment.systemPackages = [ extension ];
              services = {
                xserver.enable = true;
                desktopManager.gnome.enable = true;
                displayManager.autoLogin = { enable = true; user = "user"; };
                gnome.gnome-initial-setup.enable = false;
              };
              environment.gnome.excludePackages = [ pkgs.gnome-tour ];
              virtualisation.resolution = { x = 1280; y = 720; };
              programs.dconf = {
                enable = true;
                profiles."user".databases = [{
                  settings = {
                    "org/gnome/shell" = {
                      enabled-extensions = [ "autohide-volume@unboiled.info" ];
                    };
                    "org/gnome/settings-daemon/plugins/media-keys" = {
                      volume-down = [ "F1" ];
                      volume-up = [ "F2" ];
                    };
                  };
                }];
              };
            };
            extraPythonPackages = ps: with ps; [ pillow ];
            testScript = _: ''
              import time

              from PIL import Image

              REFERENCE_DIR = '${./reference}'
              OUT = machine.out_dir
              GENERATE_MODE = ${if generateMode then "True" else "False"}
              TIMEOUT_MULTIPLIER = ${toString timeoutMultiplier}

              def crop_corner(img_path):
                  return Image.open(img_path).crop((1200, 0, 1280, 27))

              def is_all_black(img):
                  return all(p == (0, 0, 0) for p in img.getdata())

              def wait_for_desktop():
                  for _ in range(100):
                      machine.screenshot('_probe')
                      corner = crop_corner(f'{OUT}/_probe.png').convert('RGB')
                      if not is_all_black(corner):
                          break
                      time.sleep(0.5 * TIMEOUT_MULTIPLIER)
                  time.sleep(2 * TIMEOUT_MULTIPLIER)

              def handle_reference(name):
                  actual = crop_corner(f'{OUT}/{name}.png').convert('RGB')
                  assert not is_all_black(actual), \
                         f'Screenshot `{name}` is all black'
                  reference_path = f'{REFERENCE_DIR}/{name}.png'

                  if GENERATE_MODE:
                      actual.save(f'{OUT}/{name}_corner.png')
                      return

                  reference_img = Image.open(reference_path).convert('RGB')
                  assert actual.tobytes() == reference_img.tobytes(), \
                         f'Reference mismatch `{name}`'

              with subtest('Boot GNOME'):
                  machine.wait_for_unit('display-manager.service')
                  machine.wait_for_file('/run/user/1000/wayland-0')
                  machine.wait_for_unit('default.target', 'user')
                  wait_for_desktop()

              with subtest('Initial'):
                  machine.screenshot('initial')
                  handle_reference('initial')

              with subtest('Muted'):
                  for _ in range(20):
                      machine.send_key('f1')
                      time.sleep(.2 * TIMEOUT_MULTIPLIER)
                  time.sleep(.5 * TIMEOUT_MULTIPLIER)
                  machine.screenshot('muted')
                  handle_reference('muted')

              with subtest('Unmuted again'):
                  machine.send_key('f2')
                  time.sleep(.5 * TIMEOUT_MULTIPLIER)
                  machine.screenshot('unmuted')
                  handle_reference('unmuted')
            '';
          };
    in
    {
      packages.${system} = {
        default = extension;
        screenshots = makeTest true;
        test = makeTest false;
      };
    };
}
