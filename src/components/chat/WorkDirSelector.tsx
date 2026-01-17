'use client';

interface WorkDirSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function WorkDirSelector({ value, onChange }: WorkDirSelectorProps) {
  
  // const handleFolderSelect = async () => {
  //   try {
  //     // Check if the File System Access API is available
  //     // @ts-expect-error - showDirectoryPicker is not yet in all TypeScript versions
  //     if (!window.showDirectoryPicker) {
  //       throw new Error('File System Access API not supported in this browser');
  //     }

  //     // Use the File System Access API to select a directory
  //     // @ts-expect-error - showDirectoryPicker is not yet in all TypeScript versions
  //     const directoryHandle = await window.showDirectoryPicker({
  //       mode: 'readwrite',
  //       startIn: 'desktop', // Start in a location that's more likely to be accessible
  //     });
  //     
  //     // The Web File System Access API doesn't provide the full filesystem path
  //     // for security reasons. We can only get the directory name.
  //     // For a web app, this is a limitation we need to work around.
  //     
  //     // Show the directory name as a starting point
  //     onChange(directoryHandle.name);
  //     
  //     // Show an info message to the user about the limitation
  //     alert('⚠️ Note: For security reasons, web apps cannot access full filesystem paths. ' +
  //           'Please manually enter the complete path to your working directory.');
  //     
  //   } catch (error) {
  //     // User cancelled the dialog or browser doesn't support the API
  //     console.log('Folder selection cancelled or not supported:', error);
  //     
  //     // Show appropriate error message
  //     if (error.name === 'AbortError') {
  //       // User cancelled - no need to show error
  //     } else if (error.message.includes('not supported')) {
  //       alert('❌ Your browser does not support folder selection. Please manually enter the working directory path.');
  //     } else if (error.message.includes('system access') || error.message.includes('restricted')) {
  //       alert('❌ Cannot access system folders like Downloads. Please select a project folder instead.');
  //     } else {
  //       alert('❌ Failed to select folder: ' + error.message);
  //     }
  //   }
  // };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/path/to/working/directory"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {/* Folder selection button commented out due to web API limitations */}
      {/* <button
        type="button"
        onClick={handleFolderSelect}
        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        title="Select folder using system finder"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      </button> */}
    </div>
  );
}
