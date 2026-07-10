type SettingTextControl = {
	getValue(): string;
	setValue(value: string): unknown;
};

export const syncCurrentSettingInput = (
	control: SettingTextControl,
	submittedValue: string,
	persistedValue: string,
): boolean => {
	if (control.getValue() !== submittedValue) return false;
	control.setValue(persistedValue);
	return true;
};
