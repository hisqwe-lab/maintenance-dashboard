import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Search, Filter, Calendar, Building2, Wrench, AlertTriangle, 
  TrendingUp, DollarSign, List, Download, RefreshCcw, FileWarning, 
  CheckCircle2, FileText, ShoppingCart, Activity, ArrowUpRight, ArrowDownRight,
  ArrowUpDown, Tag, Split, Info, Briefcase
} from 'lucide-react';

const App = () => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date-desc');
  const [filters, setFilters] = useState({
    building: '전체',
    category: '전체',
    facility: '전체',
    faultType: '전체',
    vendor: '전체',
    searchTerm: ''
  });

  const parsePrice = (val) => parseInt(String(val || '0').replace(/[^0-9]/g, '')) || 0;

  const processedData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      __id: index,
      '금액(원)': parsePrice(item['금액(원)'])
    }));
  }, [data]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== "");
        if (rows.length < 2) throw new Error("유효한 데이터가 부족합니다.");

        const parseCSVLine = (line) => {
          const res = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i + 1] === '"') { current += '"'; i++; }
            else if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { res.push(current.trim()); current = ""; }
            else current += char;
          }
          res.push(current.trim());
          return res;
        };

        const headers = parseCSVLine(rows[0]);
        const jsonData = rows.slice(1).map((row) => {
          const values = parseCSVLine(row);
          let obj = {};
          headers.forEach((header, i) => { if (header) obj[header] = values[i] || ""; });
          return obj;
        }).filter(item => item['날짜'] || item['제목']);

        setData(jsonData);
      } catch (err) { setError("파일 로드 실패: " + err.message); }
    };
    reader.readAsText(file, "EUC-KR"); 
  };

  const filteredData = useMemo(() => {
    let result = processedData.filter(item => {
      const matchesBuilding = filters.building === '전체' || item['건물동'] === filters.building;
      return matchesBuilding &&
             (filters.category === '전체' || item['구분'] === filters.category) &&
             (filters.facility === '전체' || item['설비명'] === filters.facility) &&
             (filters.faultType === '전체' || item['고장유형'] === filters.faultType) &&
             (filters.vendor === '전체' || item['지출품의서'] === filters.vendor) &&
             (filters.searchTerm === '' || 
              JSON.stringify(item).toLowerCase().includes(filters.searchTerm.toLowerCase()));
    });

    return result.sort((a, b) => {
      if (sortBy === 'date-desc') return String(b['날짜']).localeCompare(String(a['날짜']));
      if (sortBy === 'date-asc') return String(a['날짜']).localeCompare(String(b['날짜']));
      if (sortBy === 'price-desc') return b['금액(원)'] - a['금액(원)'];
      if (sortBy === 'price-asc') return a['금액(원)'] - b['금액(원)'];
      return 0;
    });
  }, [processedData, filters, sortBy]);

  const analysis = useMemo(() => {
    const totalCost = filteredData.reduce((acc, curr) => acc + curr['금액(원)'], 0);
    const count = filteredData.length;

    // 외주 용역 비중 계산 (용역비 + 수선공사)
    const outsourcingCost = filteredData.reduce((acc, curr) => {
      const cat = curr['구분'] || '';
      if (cat.includes('용역') || cat.includes('공사')) return acc + curr['금액(원)'];
      return acc;
    }, 0);
    const outsourcingRatio = totalCost > 0 ? (outsourcingCost / totalCost) * 100 : 0;

    const monthlyMap = {};
    const buildingMap = { '기자재동': 0, '디오밸리': 0 };

    filteredData.forEach(item => {
      const price = item['금액(원)'];
      const month = String(item['날짜'] || '').substring(0, 7);
      
      if (month) monthlyMap[month] = (monthlyMap[month] || 0) + price;

      if (item['건물동'] === '전체') {
        const gijajae = Math.round(price * 0.7);
        const diovalley = price - gijajae;
        buildingMap['기자재동'] += gijajae;
        buildingMap['디오밸리'] += diovalley;
      } else {
        const b = item['건물동'] || '기타';
        if (!buildingMap[b]) buildingMap[b] = 0;
        buildingMap[b] += price;
      }
    });

    const trend = Object.entries(monthlyMap).sort().map(([name, cost]) => ({ name, cost }));
    const buildingData = Object.entries(buildingMap)
      .filter(([_, value]) => value > 0)
      .sort((a,b) => b[1]-a[1])
      .map(([name, value]) => ({ name, value }));

    return { totalCost, count, trend, buildingData, outsourcingRatio, outsourcingCost };
  }, [filteredData]);

  const options = useMemo(() => {
    const getU = (k) => ['전체', ...new Set(processedData.map(i => i[k]).filter(Boolean))].sort();
    return {
      buildings: getU('건물동'),
      categories: getU('구분'),
      facilities: getU('설비명'),
      faults: getU('고장유형'),
      vendors: getU('지출품의서')
    };
  }, [processedData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case '수선비': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '용역비': return 'bg-purple-50 text-purple-600 border-purple-100';
      case '검사비': return 'bg-amber-50 text-amber-600 border-amber-100';
      case '수선공사': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfcfd] p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl shadow-blue-100">
            <Activity className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">MAINTENANCE OPS</h1>
          <p className="text-slate-500 mb-8 font-medium">유지보수 데이터 전문가용 분석 환경</p>
          <div className="mb-8 p-5 bg-blue-50 rounded-2xl border border-blue-100 text-left">
            <p className="text-blue-800 text-[13px] font-bold leading-relaxed flex items-center gap-2 mb-1">
              <Split size={14} /> 7:3 정밀 배분 로직 적용
            </p>
            <p className="text-blue-600 text-[12px] leading-relaxed">
              "전체" 항목 배분 시 발생하는 단수 오차를 보정하여 <strong>지출 총액과 그래프 합계가 100% 일치</strong>하도록 개선되었습니다.
            </p>
          </div>
          <label className="block group cursor-pointer">
            <div className="bg-slate-900 text-white font-bold py-5 px-8 rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-95 group-hover:-translate-y-1">
              데이터 임포트 (.CSV)
            </div>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-900">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
            <Activity className="text-blue-600 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              유지보수 분석 전문가 대시보드
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                PRECISION RATIO 7:3
              </span>
              <span className="text-slate-400 text-xs font-medium">총 {processedData.length}건 마스터 데이터</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="상세 검색..." 
              className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 w-full md:w-80 transition-all font-medium text-sm"
              value={filters.searchTerm} 
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))} 
            />
          </div>
          <button onClick={() => location.reload()} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95">
            <RefreshCcw size={20} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: '배분 적용 집행 총액', value: `₩${analysis.totalCost.toLocaleString()}`, icon: DollarSign, color: 'text-blue-600', trend: '총 지출액 합계', bg: 'bg-blue-600' },
          { label: '필터링 분석 건수', value: `${analysis.count.toLocaleString()}건`, icon: CheckCircle2, color: 'text-emerald-600', trend: '조건 부합', bg: 'bg-emerald-500' },
          { label: '외주 용역 비중', value: `${analysis.outsourcingRatio.toFixed(1)}%`, icon: Briefcase, color: 'text-purple-600', trend: `₩${analysis.outsourcingCost.toLocaleString()}`, bg: 'bg-purple-500' },
          { label: '비중 1위 건물', value: analysis.buildingData[0]?.name || '-', icon: Building2, color: 'text-rose-600', trend: '점유율 1위', bg: 'bg-rose-500' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[2rem] shadow-sm border border-slate-200/60 relative overflow-hidden group">
            <div className={`absolute -right-2 -top-2 w-24 h-24 ${kpi.bg} opacity-[0.03] rounded-full group-hover:scale-110 transition-transform`}></div>
            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
                <kpi.icon className={kpi.color} size={20} />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight">{kpi.value}</p>
                <p className={`text-[11px] font-bold mt-1.5 ${kpi.color} flex items-center gap-1`}>
                   {kpi.trend}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 mb-10">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-50 pb-5">
            <Filter size={18} className="text-blue-600" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">다차원 분석 필터</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <FilterGroup label="건물동 (Location)" icon={Building2} options={options.buildings} value={filters.building} onChange={(v) => setFilters(p => ({...p, building: v}))} />
          <FilterGroup label="비용구분 (Category)" icon={Calendar} options={options.categories} value={filters.category} onChange={(v) => setFilters(p => ({...p, category: v}))} />
          <FilterGroup label="설비명 (Asset)" icon={Wrench} options={options.facilities} value={filters.facility} onChange={(v) => setFilters(p => ({...p, facility: v}))} />
          <FilterGroup label="고장유형 (Type)" icon={AlertTriangle} options={options.faults} value={filters.faultType} onChange={(v) => setFilters(p => ({...p, faultType: v}))} />
          <FilterGroup label="수행업체 (Vendor)" icon={ShoppingCart} options={options.vendors} value={filters.vendor} onChange={(v) => setFilters(p => ({...p, vendor: v}))} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60">
          <h3 className="font-black text-lg mb-10 flex items-center gap-2"><div className="w-1.5 h-6 bg-blue-600 rounded-full"></div> 월별 비용 트렌드</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.trend}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 600}} tickFormatter={(val) => `${val/10000}만`} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: '700'}}
                  formatter={(val) => [`₩${val.toLocaleString()}`, '집행금액']} 
                />
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60">
          <h3 className="font-black text-lg mb-10 flex items-center gap-2"><div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div> 건물별 비용 점유율</h3>
          <div className="h-80 flex flex-col md:flex-row items-center">
            <div className="w-full md:w-[55%] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analysis.buildingData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                    {analysis.buildingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `₩${val.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-[45%] space-y-3 pl-4 max-h-full overflow-y-auto custom-scrollbar">
              {analysis.buildingData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-xs font-bold text-slate-600">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-slate-800 tabular-nums">₩{entry.value.toLocaleString()}</p>
                    <p className="text-[9px] font-bold text-slate-400">{((entry.value / (analysis.totalCost || 1)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-600 uppercase">합계 확인</span>
                    <span className="text-[11px] font-black text-blue-600 tabular-nums">₩{analysis.buildingData.reduce((a,b)=>a+b.value, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-lg">상세 유지보수 저널</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">원본 데이터를 기반으로 표시되며, "전체" 항목은 단일 행으로 통합 표시됩니다.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <ArrowUpDown size={14} className="text-slate-400 mr-2" />
                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-[11px] font-black text-slate-600 bg-transparent focus:outline-none cursor-pointer"
                >
                    <option value="date-desc">날짜 최신순</option>
                    <option value="date-asc">날짜 과거순</option>
                    <option value="price-desc">금액 높은순</option>
                    <option value="price-asc">금액 낮은순</option>
                </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/20 border-b border-slate-100 text-slate-400">
                <th className="px-8 py-5 font-black text-[14px] uppercase tracking-widest w-35">Date</th>
                <th className="px-6 py-5 font-black text-[14px] uppercase tracking-widest w-28">Type</th>
                <th className="px-8 py-5 font-black text-[14px] uppercase tracking-widest w-52">Asset Info</th>
                <th className="px-8 py-5 font-black text-[14px] uppercase tracking-widest">Description & Action</th>
                <th className="px-8 py-5 font-black text-[14px] uppercase tracking-widest text-right w-40">Amount</th>
                <th className="px-8 py-5 font-black text-[14px] uppercase tracking-widest w-52">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.slice(0, 100).map((item) => {
                const category = item['구분'] || '기타';
                const isAll = item['건물동'] === '전체';
                return (
                    <tr key={item.__id} className={`hover:bg-slate-50 transition-all group ${isAll ? 'bg-indigo-50/20' : ''}`}>
                    <td className="px-8 py-6 text-slate-400 text-xs font-black align-top tabular-nums">{item['날짜']}</td>
                    <td className="px-6 py-6 align-top">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm inline-block whitespace-nowrap ${getCategoryStyle(category)}`}>
                            {category}
                        </span>
                    </td>
                    <td className="px-8 py-6 align-top">
                        <div className={`font-black text-xs mb-1.5 flex items-center gap-2 ${isAll ? 'text-indigo-600' : 'text-slate-900'}`}>
                          {item['건물동']}
                          {isAll && <Tag size={12} className="text-indigo-400" />}
                        </div>
                        <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 inline-block">
                            {item['설비명']}
                        </div>
                    </td>
                    <td className="px-8 py-6">
                        <div className="font-black text-slate-800 text-sm mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                        {item['제목']}
                        </div>
                        {item['조치내용'] && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/30 flex items-start gap-3">
                            <FileText size={14} className="mt-0.5 text-slate-300 shrink-0" />
                            <span className="leading-relaxed font-medium">{item['조치내용']}</span>
                        </div>
                        )}
                        {isAll && (
                          <div className="mt-3 py-2 px-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-600 font-bold flex items-center gap-2 w-fit">
                            <Info size={14} />
                            "전체" 항목은 기자재동 70%, 디오밸리 30% 로 배분 되었습니다
                          </div>
                        )}
                    </td>
                    <td className="px-8 py-6 text-right align-top">
                        <div className="font-black text-base tabular-nums text-slate-900">
                        ₩{item['금액(원)'].toLocaleString()}
                        </div>
                        <span className="text-[9px] text-slate-300 font-bold uppercase">Transaction Amount</span>
                    </td>
                    <td className="px-8 py-6 align-top">
                        {item['지출품의서'] ? (
                            <div className="flex items-center gap-2.5 text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                                <ShoppingCart size={14} className="text-amber-500 shrink-0" />
                                <span className="text-[11px] font-bold truncate">{item['지출품의서']}</span>
                            </div>
                        ) : (
                            <span className="text-slate-200 italic text-xs">-</span>
                        )}
                    </td>
                    </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const FilterGroup = ({ label, icon: Icon, options, value, onChange }) => (
  <div className="flex flex-col gap-2.5">
    <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-widest pl-1">
      <Icon size={12} className="text-slate-300" /> {label}
    </label>
    <div className="relative group">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black focus:ring-4 focus:ring-blue-500/10 focus:bg-white outline-none appearance-none cursor-pointer hover:border-blue-300 transition-all text-slate-700 shadow-sm"
      >
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-blue-500 transition-colors">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  </div>
);

export default App;