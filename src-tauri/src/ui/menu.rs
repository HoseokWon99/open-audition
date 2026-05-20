use tauri::{
    menu::{MenuBuilder, SubmenuBuilder},
    Emitter,
};

const NATIVE_MENU_EVENT: &str = "native-menu";

pub fn install(app: &mut tauri::App) -> tauri::Result<()> {
    let handle = app.handle();

    let app_menu = SubmenuBuilder::new(handle, "Open Audition")
        .about(None)
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let file_menu = SubmenuBuilder::new(handle, "File")
        .text("file.new-session", "New Session")
        .text("file.open", "Open...")
        .text("file.save", "Save")
        .text("file.save-as", "Save As...")
        .separator()
        .close_window()
        .build()?;

    let edit_menu = SubmenuBuilder::new(handle, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let multitrack_menu = SubmenuBuilder::new(handle, "Multitrack")
        .text("multitrack.new-track", "New Track")
        .text("multitrack.export-mixdown", "Export Mixdown")
        .build()?;

    let clip_menu = SubmenuBuilder::new(handle, "Clip")
        .text("clip.split", "Split")
        .text("clip.fade-in", "Fade In")
        .text("clip.fade-out", "Fade Out")
        .text("clip.normalize", "Normalize")
        .build()?;

    let effects_menu = SubmenuBuilder::new(handle, "Effects")
        .text("effects.gain", "Gain")
        .text("effects.eq", "EQ")
        .text("effects.filter", "Filter")
        .text("effects.reverb", "Reverb")
        .text("effects.delay", "Delay")
        .text("effects.pitch-shift", "Pitch Shift")
        .text("effects.time-stretch", "Time Stretch")
        .text("effects.noise-reduction", "Noise Reduction")
        .build()?;

    let favorites_menu = SubmenuBuilder::new(handle, "Favorites")
        .text("favorites.apply-last-effect", "Apply Last Effect")
        .build()?;

    let view_menu = SubmenuBuilder::new(handle, "View")
        .text("view.zoom-in", "Zoom In")
        .text("view.zoom-out", "Zoom Out")
        .text("view.toggle-inspector", "Inspector")
        .text("view.toggle-media-browser", "Media Browser")
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(handle, "Window")
        .minimize()
        .separator()
        .bring_all_to_front()
        .build()?;

    let help_menu = SubmenuBuilder::new(handle, "Help")
        .text("help.open-documentation", "Open Documentation")
        .build()?;

    let menu = MenuBuilder::new(handle)
        .items(&[
            &app_menu,
            &file_menu,
            &edit_menu,
            &multitrack_menu,
            &clip_menu,
            &effects_menu,
            &favorites_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ])
        .build()?;

    app.set_menu(menu)?;
    app.handle().on_menu_event(|app, event| {
        let id = event.id().as_ref().to_string();
        let _ = app.emit(NATIVE_MENU_EVENT, id);
    });

    Ok(())
}
