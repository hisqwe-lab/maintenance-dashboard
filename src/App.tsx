import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Search, Filter, Calendar, Building2, Wrench, AlertTriangle, 
  TrendingUp, DollarSign, List, Download, RefreshCcw, FileWarning, 
  CheckCircle2, FileText, ShoppingCart, Activity, ArrowUpRight, ArrowDownRight,
  ArrowUpDown, Tag, Split, Info, Briefcase, ExternalLink, ChevronRight
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
    const avgCost = count > 0 ? Math.round(totalCost / count) : 0;

    const buildingMap = { '기자재동': 0, '디오밸리': 0 };
    const monthlyMap = {};

    filteredData.forEach(item => {
      const price = item['금액(원)'];
      const month = String(item['날짜'] || '').substring(0, 7);
      
      if (month) {
        if (!monthlyMap[month]) monthlyMap[month] = { total: 0, items: [] };
        monthlyMap[month].total += price;
        monthlyMap[month].items.push(item);
      }

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

    const trend = Object.entries(monthlyMap).sort().map(([name, data]) => ({ 
      name, 
      cost: data.total,
      topItems: [...data.items].sort((a, b) => b['금액(원)'] - a['금액(원)']).slice(0, 5)
    }));

    const buildingData = Object.entries(buildingMap)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const outsourcingCost = filteredData.reduce((acc, curr) => {
      const cat = curr['구분'] || '';
      return (cat.includes('용역') || cat.includes('공사')) ? acc + curr['금액(원)'] : acc;
    }, 0);
    const outsourcingRatio = totalCost > 0 ? (outsourcingCost / totalCost) * 100 : 0;

    return { totalCost, count, avgCost, trend, buildingData, outsourcingRatio, outsourcingCost };
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case '수선비': return 'bg-blue-50 text-blue-600 border-blue-100';
      case '용역비': return 'bg-purple-50 text-purple-600 border-purple-100';
      case '검사비': return 'bg-amber-50 text-amber-600 border-amber-100';
      case '수선공사': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const MonthlyTrendTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-5 shadow-2xl border border-white/10 min-w-[280px]">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
            <Calendar size={14} className="text-blue-400" />
            <span className="text-[12px] font-black uppercase tracking-wider">{label} 상세 현황</span>
          </div>
          <div className="mb-4">
            <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">월간 총 지출</div>
            <div className="text-lg font-black text-white">₩{d.cost.toLocaleString()}</div>
          </div>
          <div className="space-y-3">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Top 5 Spending Items</div>
            {d.topItems?.map((item, i) => (
              <div key={i} className="flex justify-between items-start gap-4">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[11px] text-white font-black truncate leading-tight">{i + 1}. {item['제목']}</span>
                  <span className="text-[9px] text-slate-400 font-bold">{item['건물동']} | {item['설비명']}</span>
                </div>
                <div className="text-[11px] font-black text-emerald-400 whitespace-nowrap pt-0.5">₩{item['금액(원)'].toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#fcfcfd] p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-100">
            <Activity className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">MAINTENANCE OPS</h1>
          <p className="text-slate-500 mb-8 font-medium text-sm">유지보수 데이터 전문가용 분석 환경</p>
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
            <h1 className="text-2xl font-black tracking-tight">유지보수 분석 전문가 대시보드</h1>
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
            <input 
              type="text" 
              placeholder="상세 검색..." 
              className="pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 w-full md:w-80 transition-all font-medium text-sm"
              value={filters.searchTerm} 
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))} 
            />
          </div>
          <button onClick={() => location.reload()} className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all">
            <RefreshCcw size={20} className="text-slate-500" />
          </button>
        </div>
      </header>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPICard label="배분 적용 집행 총액" value={`₩${analysis.totalCost.toLocaleString()}`} icon={DollarSign} color="text-blue-600" trend="총 지출액 합계" bg="bg-blue-600" />
        <KPICard label="필터링 분석 건수" value={`${analysis.count.toLocaleString()}건`} icon={CheckCircle2} color="text-emerald-600" trend="조건 부합" bg="bg-emerald-500" />
        <KPICard label="단위당 평균 비용" value={`₩${analysis.avgCost.toLocaleString()}`} icon={TrendingUp} color="text-amber-600" trend="건당 평균" bg="bg-amber-500" highlight />
        <KPICard label="비중 1위 건물" value={analysis.buildingData[0]?.name || '-'} icon={Building2} color="text-rose-600" trend="점유율 1위" bg="bg-rose-500" />
      </div>

      {/* 필터 */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 mb-10">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-50 pb-5">
            <Filter size={18} className="text-blue-600" />
            <h2 className="text-l font-black text-slate-800 uppercase tracking-tight">다차원 분석 필터</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-cols-5 gap-8">
          <FilterGroup label="건물동 (LOCATION)" icon={Building2} options={options.buildings} value={filters.building} onChange={(v) => setFilters(p => ({...p, building: v}))} />
          <FilterGroup label="비용구분 (CATEGORY)" icon={Calendar} options={options.categories} value={filters.category} onChange={(v) => setFilters(p => ({...p, category: v}))} />
          <FilterGroup label="설비명 (ASSET)" icon={Wrench} options={options.facilities} value={filters.facility} onChange={(v) => setFilters(p => ({...p, facility: v}))} />
          <FilterGroup label="고장유형 (TYPE)" icon={AlertTriangle} options={options.faults} value={filters.faultType} onChange={(v) => setFilters(p => ({...p, faultType: v}))} />
          <FilterGroup label="수행업체 (VENDOR)" icon={ShoppingCart} options={options.vendors} value={filters.vendor} onChange={(v) => setFilters(p => ({...p, vendor: v}))} />
        </div>
      </section>

      {/* 그래프 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60">
          <h3 className="font-black text-lg mb-10 flex items-center gap-3">
            <div className="w-1.5 h-7 bg-blue-600 rounded-full"></div> 월별 비용 트렌드
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.trend}>
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 800}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8', fontWeight: 800}} tickFormatter={(val) => `${val/10000}만`} />
                <Tooltip content={<MonthlyTrendTooltip />} cursor={{ stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '6 6' }} />
                <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCost)" dot={{ r: 5, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60">
          <h3 className="font-black text-lg mb-10 flex items-center gap-3"><div className="w-1.5 h-7 bg-emerald-500 rounded-full"></div> 건물별 비용 점유율 (정밀 배분)</h3>
          <div className="h-80 flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analysis.buildingData} innerRadius={70} outerRadius={110} paddingAngle={10} dataKey="value" stroke="none">
                    {analysis.buildingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val) => `₩${val.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4 pl-8">
              {analysis.buildingData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                    <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 tabular-nums">₩{entry.value.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400">{((entry.value / (analysis.totalCost || 1)) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-600">합계 확인</span>
                <span className="text-sm font-black text-blue-600 tabular-nums">₩{analysis.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 상세 유지보수 저널 - 스크린샷 기반 고도화 */}
      <section className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2 text-xl tracking-tight">상세 유지보수 저널</h3>
            <p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">원본 데이터를 기반으로 표시되며, "전체" 항목은 단일 행으로 통합 표시됩니다.</p>
          </div>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-50 text-slate-400">
                <th className="pl-10 pr-6 py-6 font-black text-[16px] uppercase tracking-widest w-32">Date</th>
                <th className="px-6 py-6 font-black text-[16px] uppercase tracking-widest w-40">Type</th>
                <th className="px-6 py-6 font-black text-[16px] uppercase tracking-widest w-40">Asset Info</th>
                <th className="px-6 py-6 font-black text-[16px] uppercase tracking-widest">Description & Action</th>
                <th className="px-6 py-6 font-black text-[16px] uppercase tracking-widest text-right w-44">Amount</th>
                <th className="pl-6 pr-10 py-6 font-black text-[16px] uppercase tracking-widest w-44">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 50).map((item) => {
                const category = item['구분'] || '기타';
                const isAll = item['건물동'] === '전체';
                return (
                    <tr key={item.__id} className="border-b border-slate-50/80 hover:bg-slate-50/50 transition-all group">
                      <td className="pl-10 pr-6 py-8 align-top">
                        <span className="text-slate-400 text-l font-black tabular-nums tracking-tighter">{item['날짜']}</span>
                      </td>
                      <td className="px-10 py-8 align-top">
                        <span className={`text-[15px] font-black px-2.5 py-1 rounded-lg border shadow-sm inline-block ${getCategoryStyle(category)}`}>
                            {category}
                        </span>
                      </td>
                      <td className="px-6 py-8 align-top">
                          <div className={`font-black text-l mb-2 flex items-center gap-1.5 ${isAll ? 'text-blue-600' : 'text-slate-900'}`}>
                            {item['건물동']} {isAll && <Split size={11} className="rotate-90" />}
                          </div>
                          <div className="text-[13px] text-slate-400 font-bold px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 inline-block uppercase tracking-tighter">
                            {item['설비명']}
                          </div>
                      </td>
                      <td className="px-6 py-8 align-top">
                          <div className="font-black text-slate-800 text-[16px] mb-3">{item['제목']}</div>
                          {item['조치내용'] && (
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex items-start gap-3 mb-3">
                              <FileText size={14} className="text-slate-300 mt-0.5 shrink-0" />
                              <span className="text-[14px] text-slate-500 font-medium leading-relaxed">{item['조치내용']}</span>
                            </div>
                          )}
                          {isAll && (
                            <div className="bg-blue-50/40 rounded-xl px-4 py-2.5 border border-blue-100 flex items-center gap-2">
                              <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                                <Info size={10} className="text-white" />
                              </div>
                              <span className="text-[12px] text-blue-600 font-black">"전체" 항목은 기자재동 70%, 디오밸리 30% 로 배분 되었습니다</span>
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-8 align-top text-right">
                          <div className="font-black text-slate-900 text-base tabular-nums">₩{item['금액(원)'].toLocaleString()}</div>
                          <div className="text-[9px] text-slate-300 font-black uppercase tracking-tighter mt-1">Transaction Amount</div>
                      </td>
                      <td className="pl-6 pr-10 py-8 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-sm hover:border-blue-300 transition-colors cursor-pointer group/ref">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <ShoppingCart size={13} className="text-amber-500 shrink-0" />
                              <span className="text-[13px] font-black text-slate-600 truncate">{item['지출품의서'] || '공급업체'}</span>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover/ref:text-blue-500 transition-colors" />
                          </div>
                        </div>
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

const KPICard = ({ label, value, icon: Icon, color, trend, bg, highlight }) => (
  <div className={`bg-white p-8 rounded-[2.5rem] shadow-sm border ${highlight ? 'border-amber-100 ring-4 ring-amber-500/5' : 'border-slate-200/60'} relative overflow-hidden group hover:scale-[1.02] transition-all`}>
    <div className={`absolute -right-4 -top-4 w-28 h-28 ${bg} opacity-[0.04] rounded-full group-hover:scale-125 transition-transform duration-500`}></div>
    <div className="flex flex-col h-full justify-between relative z-10">
      <div className="flex items-center justify-between mb-8">
        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`p-2.5 rounded-xl ${bg} bg-opacity-10`}>
          <Icon className={color} size={20} />
        </div>
      </div>
      <div>
        <p className="text-3xl font-black tracking-tighter text-slate-900 mb-2">{value}</p>
        <p className={`text-[11px] font-black ${highlight ? 'text-amber-600' : color} flex items-center gap-1.5`}>
           {highlight && <TrendingUp size={12} />} {trend}
        </p>
      </div>
    </div>
  </div>
);

const FilterGroup = ({ label, icon: Icon, options, value, onChange }) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest pl-1">
      <Icon size={13} className="text-slate-300" /> {label}
    </label>
    <div className="relative group">
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-xs font-black focus:ring-8 focus:ring-blue-500/5 focus:bg-white focus:border-blue-400 outline-none appearance-none cursor-pointer hover:border-blue-300 transition-all text-slate-700 shadow-sm"
      >
        {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-blue-500 transition-colors">
        <ChevronRight size={16} className="rotate-90" />
      </div>
    </div>
  </div>
);

export default App;