export default function ChannelPicker() {
  return (
    <fieldset className="text-sm">
      <legend className="label">Send via</legend>
      <div className="flex flex-wrap gap-x-5">
        {[["in_app", "In-app"], ["email", "Email"], ["push", "Browser push"]].map(([v, l]) => (
          <label key={v} className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="channels" value={v} defaultChecked /> {l}</label>
        ))}
      </div>
      <p className="text-xs text-slate-500">All ticked = all channels.</p>
    </fieldset>
  );
}
