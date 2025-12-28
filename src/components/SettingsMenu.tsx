import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { Settings, Sun, Moon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select } from './ui/select';
import { Input } from './ui/input';
import { settingsStore, toggleTheme } from '../store/settings-store';

export function SettingsMenu() {
    const settings = useSnapshot(settingsStore);
    const [optionsOpen, setOptionsOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setOptionsOpen(true)}>
                        <Settings size={16} className="mr-2" />
                        Options...
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={toggleTheme}>
                        {settings.theme === 'dark' ? (
                            <>
                                <Sun size={16} className="mr-2" />
                                Light Mode
                            </>
                        ) : (
                            <>
                                <Moon size={16} className="mr-2" />
                                Dark Mode
                            </>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Prettier Options</DialogTitle>
                        <DialogDescription>
                            Configure code formatting settings. Changes are saved automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Print Width */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="printWidth">Print Width</Label>
                            <Input
                                id="printWidth"
                                type="number"
                                min={40}
                                max={200}
                                value={settings.prettier.printWidth}
                                onChange={(e) => {
                                    settingsStore.prettier.printWidth = parseInt(e.target.value) || 80;
                                }}
                            />
                        </div>

                        {/* Tab Width */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="tabWidth">Tab Width</Label>
                            <Input
                                id="tabWidth"
                                type="number"
                                min={1}
                                max={8}
                                value={settings.prettier.tabWidth}
                                onChange={(e) => {
                                    settingsStore.prettier.tabWidth = parseInt(e.target.value) || 2;
                                }}
                            />
                        </div>

                        {/* Use Tabs */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="useTabs">Use Tabs</Label>
                            <div className="flex justify-end">
                                <Switch
                                    id="useTabs"
                                    checked={settings.prettier.useTabs}
                                    onCheckedChange={(checked) => {
                                        settingsStore.prettier.useTabs = checked;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Semicolons */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="semi">Semicolons</Label>
                            <div className="flex justify-end">
                                <Switch
                                    id="semi"
                                    checked={settings.prettier.semi}
                                    onCheckedChange={(checked) => {
                                        settingsStore.prettier.semi = checked;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Single Quote */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="singleQuote">Single Quotes</Label>
                            <div className="flex justify-end">
                                <Switch
                                    id="singleQuote"
                                    checked={settings.prettier.singleQuote}
                                    onCheckedChange={(checked) => {
                                        settingsStore.prettier.singleQuote = checked;
                                    }}
                                />
                            </div>
                        </div>

                        {/* JSX Single Quote */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="jsxSingleQuote">JSX Single Quotes</Label>
                            <div className="flex justify-end">
                                <Switch
                                    id="jsxSingleQuote"
                                    checked={settings.prettier.jsxSingleQuote}
                                    onCheckedChange={(checked) => {
                                        settingsStore.prettier.jsxSingleQuote = checked;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Bracket Spacing */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="bracketSpacing">Bracket Spacing</Label>
                            <div className="flex justify-end">
                                <Switch
                                    id="bracketSpacing"
                                    checked={settings.prettier.bracketSpacing}
                                    onCheckedChange={(checked) => {
                                        settingsStore.prettier.bracketSpacing = checked;
                                    }}
                                />
                            </div>
                        </div>

                        {/* Trailing Comma */}
                        <div className="grid grid-cols-2 items-center gap-4">
                            <Label htmlFor="trailingComma">Trailing Comma</Label>
                            <Select
                                id="trailingComma"
                                value={settings.prettier.trailingComma}
                                onChange={(e) => {
                                    settingsStore.prettier.trailingComma = e.target.value as 'none' | 'es5' | 'all';
                                }}
                                options={[
                                    { value: 'none', label: 'None' },
                                    { value: 'es5', label: 'ES5' },
                                    { value: 'all', label: 'All' },
                                ]}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

