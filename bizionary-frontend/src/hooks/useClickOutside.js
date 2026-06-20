import { useEffect } from 'react';

const useClickOutside = (ref, callback, active = true, excludeRef = null) => {
    useEffect(() => {
        if (!active) return;

        const handleClickOutside = (event) => {
            // Check if click is inside the main ref element
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            
            // Check if click is inside the excluded ref element (if provided)
            if (excludeRef && excludeRef.current && excludeRef.current.contains(event.target)) {
                return;
            }

            callback(event);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [ref, callback, active, excludeRef]);
};

export default useClickOutside;
