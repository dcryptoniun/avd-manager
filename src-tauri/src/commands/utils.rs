use std::process::Command;

pub fn create_command(cmd: &str) -> Command {
    let mut command = Command::new(cmd);
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW flag to prevent terminal popups on Windows
        command.creation_flags(0x08000000);
    }
    
    command
}
