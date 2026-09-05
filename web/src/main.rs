const DEFAULT_WEB_PORT: u16 = 7420;

fn parse_web_options() -> (String, u16, Vec<String>) {
    // Loopback by default: binding wider exposes shell and filesystem access,
    // so reaching the tailnet is opt-in via --remote.
    let mut host = "127.0.0.1".to_string();
    let mut remote = false;
    let mut port: u16 = std::env::var("VITE_WEB_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_WEB_PORT);

    // Extra CORS origins beyond loopback/Tailscale, e.g. a custom domain
    // reverse-proxying to this server. Requests from these origins still need
    // a valid device token unless they're also loopback.
    let mut allowed_origins: Vec<String> = std::env::var("CODEXIA_ALLOWED_ORIGINS")
        .ok()
        .map(|v| v.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect())
        .unwrap_or_default();

    let mut args = std::env::args().skip(1).peekable();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--port" | "--web-port" => {
                if let Some(v) = args.next() {
                    if let Ok(p) = v.parse::<u16>() {
                        port = p;
                    }
                }
            }
            _ if arg.starts_with("--web-port=") => {
                if let Some(v) = arg.split('=').nth(1) {
                    if let Ok(p) = v.parse::<u16>() {
                        port = p;
                    }
                }
            }
            "--remote" => remote = true,
            "--allow-origin" => {
                if let Some(v) = args.next() {
                    allowed_origins.push(v);
                }
            }
            _ if arg.starts_with("--allow-origin=") => {
                if let Some(v) = arg.split('=').nth(1) {
                    allowed_origins.push(v.to_string());
                }
            }
            _ => {}
        }
    }

    if remote {
        match codexia_web::tailscale::detect() {
            Some(info) => {
                eprintln!(
                    "Binding to the tailnet: http://{}:{} ({})",
                    info.dns_name, port, info.ipv4
                );
                host = info.ipv4;
            }
            None => {
                eprintln!(
                    "--remote requires Tailscale to be installed, running, and logged in; staying on loopback"
                );
            }
        }
    }

    (host, port, allowed_origins)
}

fn main() {
    let (host, port, allowed_origins) = parse_web_options();
    if !allowed_origins.is_empty() {
        eprintln!("Extra CORS origins allowed: {:?}", allowed_origins);
        codexia_web::router::set_extra_allowed_origins(allowed_origins);
    }
    codexia_web::start_server(&host, port);
}
