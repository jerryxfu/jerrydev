const reportWebVitals = (onPerfEntry: any) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import('web-vitals').then((webVitals) => {
            webVitals.onCLS(onPerfEntry);
            webVitals.onINP(onPerfEntry);
            webVitals.onLCP(onPerfEntry);
            webVitals.onFCP(onPerfEntry);
            webVitals.onTTFB(onPerfEntry);
        });
    }
};

export default reportWebVitals;
